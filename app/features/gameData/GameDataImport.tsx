"use client"

import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Button } from '@/app/components/ui/button'
import { previewGameDataImportAction, publishGameDataImportAction } from '@/app/actions/gameData.actions'
import type { Ability, AttributeEntry, GameDatasetKind, Rarity } from '@/server/domains/gameData/types/datasets'
import type { LuaParseError } from '@/server/domains/gameData/types/luaValue'
import type { GameDataPreview, KindChoice, KindChoices, StoredGameDatasets } from '@/server/domains/gameData/types/preview'
import type { GameTerm } from '@/server/domains/gameData/terms/types'
import type { SpecLinkDecision } from '@/server/domains/gameData/types/specLinks'
import type { SpecWithAllRegions } from '@/server/domains/spec/types'
import { planSpecOps } from '@/server/domains/gameData/helpers/specLoadouts/linkPlan'
import { publishBlocker, seedProposalDecisions, summarizeSpecWrites } from '@/server/domains/gameData/helpers/specLoadouts/importFlow'
import { GAME_DATASET_KINDS } from '@/server/domains/gameData/types/datasets'
import { DATASET_LABELS } from '@/server/domains/gameData/helpers/datasets/registry'
import { toast } from '@/app/utils/toast'
import DatasetPreviewCard, { diffParts } from './DatasetPreviewCard'
import IssueList from './IssueList'
import StoredDatasetsStrip from './StoredDatasetsStrip'
import SavedDatasetPanel from './SavedDatasetPanel'
import PendingStatements from './PendingStatements'
import { canChoose, joinFiles, sourceForLine, type PasteSource } from './pasteSources'
import SpecLinkSections from './specLink/SpecLinkSections'
import PublishSection, { type PublishDone } from './specLink/PublishSection'
import { cn } from '@/lib/utils'

async function readFiles(files: FileList | File[]) {
    return joinFiles(await Promise.all([...files].map(async f => ({ name: f.name, text: await f.text() }))))
}

interface GameDataImportProps {
    initialStored: StoredGameDatasets
    terms: GameTerm[]
    storedError: string | null
    onStoredChange?: (stored: StoredGameDatasets) => void
    onSpecsChange?: (specs: SpecWithAllRegions[]) => void
    onSkipsChange?: (skipped: string[]) => void
}

function TextAction({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="text-sm font-medium text-muted-foreground transition-colors duration-150 enabled:hover:text-foreground disabled:opacity-50 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
            {children}
        </button>
    )
}

function Heading({ title, count, aside }: { title: string; count?: number; aside?: ReactNode }) {
    return (
        <h3 className="flex items-baseline gap-2 border-b border-border pb-2 text-sm font-semibold text-foreground">
            {title}
            {count !== undefined && <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">{count}</span>}
            {aside && <span className="ml-auto text-xs font-normal text-muted-foreground">{aside}</span>}
        </h3>
    )
}

export default function GameDataImport({ initialStored, terms, storedError, onStoredChange, onSpecsChange, onSkipsChange }: GameDataImportProps) {
    const [stored, setStored] = useState(initialStored)
    const [viewing, setViewing] = useState<GameDatasetKind | null>(null)
    const [text, setText] = useState('')
    const [choices, setChoices] = useState<KindChoices>({})
    const [sources, setSources] = useState<PasteSource[]>([])
    const [preview, setPreview] = useState<GameDataPreview | null>(null)
    const [previewedText, setPreviewedText] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [dragging, setDragging] = useState(false)
    const [decisions, setDecisions] = useState<Record<string, SpecLinkDecision>>({})
    const [restored, setRestored] = useState<ReadonlySet<string>>(new Set())
    const [done, setDone] = useState<PublishDone | null>(null)
    const fileInput = useRef<HTMLInputElement>(null)

    const ok = preview?.status === 'ok' ? preview : null
    const plan = ok?.specLinks ?? null
    const specPlan = useMemo(() => (plan ? planSpecOps(plan, Object.values(decisions), plan.specs) : null), [plan, decisions])
    const specOps = specPlan?.ok ? specPlan.value.ops.length : 0
    const planErrors = specPlan && !specPlan.ok ? specPlan.error : []
    const heightChanges = specPlan?.ok ? specPlan.value.heightChanges : []
    const restoredOpen = plan ? plan.items.filter(i => i.status === 'skipped' && restored.has(i.gameKey) && decisions[i.gameKey] === undefined).length : 0
    const undecided = (specPlan?.ok ? specPlan.value.undecided.length : 0) + restoredOpen
    const summary = useMemo(() => (plan ? summarizeSpecWrites(plan, decisions) : null), [plan, decisions])

    const stale = preview !== null && previewedText !== text
    const blocker = ok
        ? publishBlocker({ stale, canPublish: ok.canPublish, pending: ok.pending.length, planErrors: planErrors.length, undecided, hasChanges: ok.hasChanges, specOps })
        : null
    const changedDatasets = ok
        ? ok.datasets
            .filter(d => !d.diff || !d.diff.unchanged)
            .map(d => ({ label: DATASET_LABELS[d.kind], diff: d.diff ? diffParts(d.diff) : `${d.count}, new` }))
        : []

    function decide(gameKey: string, decision: SpecLinkDecision | undefined) {
        setDecisions(current => {
            const next = { ...current }
            if (decision) next[gameKey] = decision
            else delete next[gameKey]
            return next
        })
    }

    function restore(gameKey: string, on: boolean) {
        setRestored(current => {
            const next = new Set(current)
            if (on) next.add(gameKey)
            else next.delete(gameKey)
            return next
        })
        decide(gameKey, on ? { gameKey, action: 'leave' } : undefined)
    }

    function changeText(next: string, nextSources: PasteSource[] = []) {
        setText(next)
        setChoices({})
        setSources(nextSources)
    }

    async function loadPreview(source: string, kindChoices: KindChoices = choices, keepDecisions = false) {
        const result = await previewGameDataImportAction({ text: source, kindChoices })
        if (!result.ok) { toast.error(result.error.message); return }
        setPreview(result.value)
        setPreviewedText(source)
        if (!keepDecisions) {
            setDecisions(result.value.status === 'ok' && result.value.specLinks ? seedProposalDecisions(result.value.specLinks) : {})
            setRestored(new Set())
        }
    }

    const choosable = canChoose({ previewedText, text, busy })

    async function choose(line: number, choice: KindChoice) {
        if (previewedText === null || !canChoose({ previewedText, text, busy })) return
        const next = { ...choices, [line]: choice }
        setChoices(next)
        setBusy(true)
        try {
            await loadPreview(previewedText, next, true)
        } finally {
            setBusy(false)
        }
    }

    async function runPreview() {
        setBusy(true)
        setDone(null)
        try {
            await loadPreview(text)
        } finally {
            setBusy(false)
        }
    }

    function clear() {
        changeText('')
        setPreview(null)
        setPreviewedText(null)
        setDecisions({})
        setRestored(new Set())
        setDone(null)
    }

    async function runPublish() {
        if (previewedText === null) return
        setBusy(true)
        try {
            const result = await publishGameDataImportAction({ text: previewedText, specLinks: Object.values(decisions), kindChoices: choices })
            if (!result.ok) { toast.error(result.error.message); return }
            setDone({
                at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
                datasets: result.value.published.map(k => DATASET_LABELS[k]),
                summary,
                heights: heightChanges.length,
            })
            setStored(result.value.stored)
            onStoredChange?.(result.value.stored)
            onSpecsChange?.(result.value.specs)
            onSkipsChange?.(result.value.skipped)
            await loadPreview(previewedText)
        } finally {
            setBusy(false)
        }
    }

    async function loadFiles(files: FileList | File[]) {
        if (files.length === 0) return
        const joined = await readFiles(files)
        changeText(joined.text, joined.sources)
    }

    function onDrop(e: DragEvent<HTMLTextAreaElement>) {
        if (e.dataTransfer.files.length === 0) return
        e.preventDefault()
        setDragging(false)
        void loadFiles(e.dataTransfer.files)
    }

    return (
        <div className="mt-6 space-y-10 pb-10">
            <div>
                <textarea
                    value={text}
                    onChange={e => changeText(e.target.value)}
                    onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true) } }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    spellCheck={false}
                    aria-label="Lua tables to import"
                    placeholder={'AbilityCatalog.Abilities = {\n    Bounce = { ... },\n}'}
                    className={cn(
                        'block h-72 w-full resize-y rounded-[2px] border-0 bg-muted p-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                        dragging && 'ring-1 ring-primary',
                    )}
                    style={{ tabSize: 4 }}
                />
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <Button variant="outline" size="sm" className="rounded-sm" disabled={busy || text.trim() === ''} onClick={runPreview}>
                        {busy ? 'Working…' : 'Preview'}
                    </Button>
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".txt,.lua,.luau"
                        multiple
                        className="hidden"
                        onChange={e => { if (e.target.files) void loadFiles(e.target.files); e.target.value = '' }}
                    />
                    <TextAction onClick={() => fileInput.current?.click()}>Load files</TextAction>
                    <TextAction disabled={busy || (text === '' && preview === null)} onClick={clear}>Clear</TextAction>
                    {stale && <span className="text-sm text-muted-foreground">The paste changed since this preview.</span>}
                    <span className="ml-auto text-xs text-muted-foreground">
                        Paste Lua tables or drop .txt files. Recognized: {GAME_DATASET_KINDS.map(k => DATASET_LABELS[k]).join(', ')}.
                    </span>
                </div>
            </div>

            {preview?.status === 'parse_error' && <ParseError error={preview.error} />}
            {ok && <FoundInPaste preview={ok} stored={stored} terms={terms} onChoose={choose} canChoose={choosable} fileFor={line => sourceForLine(sources, line)} />}
            {plan && (
                <SpecLinkSections
                    plan={plan}
                    decisions={decisions}
                    onDecide={decide}
                    restored={restored}
                    onRestore={restore}
                    done={done !== null}
                />
            )}
            {(ok || done) && (
                <PublishSection
                    datasets={changedDatasets}
                    summary={summary}
                    heightChanges={heightChanges}
                    errors={planErrors}
                    blocker={blocker}
                    undecided={undecided}
                    busy={busy}
                    done={done}
                    onPublish={runPublish}
                />
            )}

            <section>
                <Heading title="Saved datasets" />
                {storedError
                    ? <p className="mt-2.5 text-sm text-destructive">Could not load stored datasets: {storedError}</p>
                    : <StoredDatasetsStrip stored={stored.summaries} selected={viewing} onSelect={setViewing} />}
                {viewing && <SavedDatasetPanel kind={viewing} stored={stored} terms={terms} />}
            </section>
        </div>
    )
}

function ParseError({ error }: { error: LuaParseError }) {
    const caret = error.lineText.slice(0, error.column - 1).replace(/[^\t]/g, ' ') + '^'
    return (
        <section>
            <Heading title="Found in the paste" />
            <p role="alert" className="mt-2.5 text-sm font-semibold text-destructive">
                Line <span className="font-mono tabular-nums">{error.line}</span>, column <span className="font-mono tabular-nums">{error.column}</span>: {error.message}
            </p>
            <pre className="mt-2 overflow-x-auto rounded-[2px] bg-muted p-3 font-mono text-xs" style={{ tabSize: 4 }}>
                {error.lineText}
                {'\n'}
                <span className="text-destructive">{caret}</span>
            </pre>
        </section>
    )
}

interface FoundInPasteProps {
    preview: Extract<GameDataPreview, { status: 'ok' }>
    stored: StoredGameDatasets
    terms: GameTerm[]
    onChoose: (line: number, choice: KindChoice) => void
    canChoose: boolean
    fileFor: (line: number) => string | null
}

function FoundInPaste({ preview, stored, terms, onChoose, canChoose: choosable, fileFor }: FoundInPasteProps) {
    const unchecked = GAME_DATASET_KINDS.filter(k => !preview.checkedKinds.includes(k))
    const pasted = (kind: GameDatasetKind) => preview.datasets.find(d => d.kind === kind)?.payload
    const links = {
        abilities: (pasted('abilities') as Ability[] | undefined) ?? stored.payloads.abilities,
        rarities: (pasted('rarities') as Rarity[] | undefined) ?? stored.payloads.rarities,
        physicals: (pasted('physicals') as AttributeEntry[] | undefined) ?? stored.payloads.physicals,
        technicals: (pasted('technicals') as AttributeEntry[] | undefined) ?? stored.payloads.technicals,
        terms,
    }
    const notes = preview.ignored.length > 0 || (unchecked.length > 0 && preview.datasets.length > 0) || preview.crossIssues.length > 0

    return (
        <section>
            <Heading title="Found in the paste" count={preview.datasets.length} />
            {notes && (
                <div className="mt-2.5 space-y-1 text-sm text-muted-foreground">
                    {unchecked.length > 0 && preview.datasets.length > 0 && (
                        <p>Not cross-checked against {unchecked.map(k => DATASET_LABELS[k]).join(', ')} (not in this paste).</p>
                    )}
                    {preview.ignored.length > 0 && (
                        <p>
                            Ignored:{' '}
                            {preview.ignored.map(s => (
                                <span key={`${s.target}-${s.line}`} className="mr-3 font-mono text-xs">{s.target ?? 'return'} <span className="tabular-nums">(line {s.line})</span></span>
                            ))}
                        </p>
                    )}
                    <IssueList issues={preview.crossIssues} showKind />
                </div>
            )}
            <PendingStatements pending={preview.pending} onChoose={onChoose} disabled={!choosable} fileFor={fileFor} />
            <div className="mt-1.5">
                {preview.datasets.length === 0
                    ? preview.pending.length === 0 && <p className="py-2 text-sm text-muted-foreground">No known dataset in this paste.</p>
                    : preview.datasets.map(d => <DatasetPreviewCard key={d.kind} dataset={d} links={links} onReadAs={onChoose} readAsDisabled={!choosable} file={fileFor(d.line)} />)}
            </div>
        </section>
    )
}
