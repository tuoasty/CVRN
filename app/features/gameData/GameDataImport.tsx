"use client"

import { useRef, useState, type DragEvent } from 'react'
import { FileUp } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { previewGameDataImportAction } from '@/app/actions/gameData.actions'
import type { GameDataPreview, LuaParseError } from '@/server/domains/gameData'
import { DATASET_LABELS, GAME_DATASET_KINDS } from '@/server/domains/gameData'
import { toast } from '@/app/utils/toast'
import DatasetPreviewCard from './DatasetPreviewCard'
import IssueList from './IssueList'
import { cn } from '@/lib/utils'

async function readFiles(files: FileList | File[]): Promise<string> {
    const texts = await Promise.all([...files].map(f => f.text()))
    return texts.join('\n\n')
}

export default function GameDataImport() {
    const [text, setText] = useState('')
    const [preview, setPreview] = useState<GameDataPreview | null>(null)
    const [previewedText, setPreviewedText] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [dragging, setDragging] = useState(false)
    const fileInput = useRef<HTMLInputElement>(null)

    const stale = preview !== null && previewedText !== text

    async function runPreview() {
        setBusy(true)
        try {
            const result = await previewGameDataImportAction({ text })
            if (!result.ok) { toast.error(result.error.message); return }
            setPreview(result.value)
            setPreviewedText(text)
        } finally {
            setBusy(false)
        }
    }

    async function loadFiles(files: FileList | File[]) {
        if (files.length === 0) return
        setText(await readFiles(files))
    }

    function onDrop(e: DragEvent<HTMLTextAreaElement>) {
        if (e.dataTransfer.files.length === 0) return
        e.preventDefault()
        setDragging(false)
        void loadFiles(e.dataTransfer.files)
    }

    return (
        <div className="mt-6 space-y-4">
            <div className="panel p-4 space-y-3">
                <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground flex-1">
                        Paste Lua tables or drop .txt files. Recognized: {GAME_DATASET_KINDS.map(k => DATASET_LABELS[k]).join(', ')}.
                    </p>
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".txt,.lua,.luau"
                        multiple
                        className="hidden"
                        onChange={e => { if (e.target.files) void loadFiles(e.target.files); e.target.value = '' }}
                    />
                    <Button variant="outline" size="sm" className="rounded-sm gap-1" onClick={() => fileInput.current?.click()}>
                        <FileUp className="h-4 w-4" /> Load files
                    </Button>
                </div>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true) } }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    spellCheck={false}
                    placeholder={'AbilityCatalog.Abilities = {\n    Bounce = { ... },\n}'}
                    className={cn(
                        'w-full h-72 resize-y bg-background border border-border rounded-sm p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring',
                        dragging && 'border-primary',
                    )}
                    style={{ tabSize: 4 }}
                />
                <div className="flex items-center gap-2">
                    <Button size="sm" className="rounded-sm" disabled={busy || text.trim() === ''} onClick={runPreview}>
                        {busy ? 'Reading…' : 'Preview'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-sm"
                        disabled={busy || (text === '' && preview === null)}
                        onClick={() => { setText(''); setPreview(null); setPreviewedText(null) }}
                    >
                        Clear
                    </Button>
                    {stale && <span className="text-sm text-muted-foreground">The paste changed since this preview.</span>}
                </div>
            </div>

            {preview?.status === 'parse_error' && <ParseErrorPanel error={preview.error} />}
            {preview?.status === 'ok' && <PreviewResult preview={preview} />}
        </div>
    )
}

function ParseErrorPanel({ error }: { error: LuaParseError }) {
    const caret = error.lineText.slice(0, error.column - 1).replace(/[^\t]/g, ' ') + '^'
    return (
        <div className="panel border-destructive/60 p-4 space-y-2">
            <p className="text-sm font-semibold text-destructive">
                Line <span className="font-mono tabular-nums">{error.line}</span>, column <span className="font-mono tabular-nums">{error.column}</span>: {error.message}
            </p>
            <pre className="font-mono text-xs bg-muted/30 p-3 overflow-x-auto" style={{ tabSize: 4 }}>
                {error.lineText}
                {'\n'}
                <span className="text-destructive">{caret}</span>
            </pre>
        </div>
    )
}

function PreviewResult({ preview }: { preview: Extract<GameDataPreview, { status: 'ok' }> }) {
    const unchecked = GAME_DATASET_KINDS.filter(k => !preview.checkedKinds.includes(k))

    return (
        <div className="space-y-4">
            <div className="panel p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold">
                        {preview.datasets.length} dataset{preview.datasets.length === 1 ? '' : 's'} detected
                    </span>
                    <span className={preview.canPublish ? 'text-muted-foreground' : 'text-destructive'}>
                        {preview.datasets.length === 0
                            ? 'Nothing to import'
                            : preview.canPublish ? 'No blocking errors' : 'Fix the errors before publishing'}
                    </span>
                </div>
                {preview.ignored.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                        Ignored (not a known dataset):{' '}
                        {preview.ignored.map(s => (
                            <span key={`${s.target}-${s.line}`} className="font-mono text-xs mr-3">{s.target} <span className="tabular-nums">(line {s.line})</span></span>
                        ))}
                    </p>
                )}
                {unchecked.length > 0 && preview.datasets.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                        Not cross-checked against {unchecked.map(k => DATASET_LABELS[k]).join(', ')} (not in this paste).
                    </p>
                )}
                <IssueList issues={preview.crossIssues} showKind />
            </div>

            {preview.datasets.map(d => <DatasetPreviewCard key={d.kind} dataset={d} />)}
        </div>
    )
}
