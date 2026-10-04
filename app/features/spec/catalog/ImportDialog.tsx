'use client';

import {useEffect, useState} from 'react';
import {ChevronRight, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/app/components/ui/button';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/app/components/ui/dialog';
import {importSpecRequirements} from '@/app/hooks/useSpecs';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';
import {
    SpecImportMode,
    SpecImportResult,
    SpecImportSpecDiff,
    SpecStatChange,
    specStatLabel,
} from '@/server/domains/spec/types';
import {formatThreshold} from './RequirementCells';
import {groupImportIssues, importPreviewModel, summarizeSpecDiff} from './transfer';

export type ImportFile = {name: string; parsed: unknown} | {name: string; parseError: true};

interface Props {
    file: ImportFile | null;
    regionId: string;
    regionCode: string;
    onClose: () => void;
    onChooseAnother: () => void;
}

const MODES: {value: SpecImportMode; label: string}[] = [
    {value: 'shape', label: 'Shape'},
    {value: 'full', label: 'Full'},
];

const TIER_SHORT = {main: 'MAIN', secondary: 'SEC'} as const;

export default function ImportDialog({file, regionId, regionCode, onClose, onChooseAnother}: Props) {
    const code = regionCode.toUpperCase();
    const [mode, setMode] = useState<SpecImportMode>('shape');
    const [result, setResult] = useState<SpecImportResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    useEffect(() => {
        setMode('shape');
        setExpanded(new Set());
    }, [file]);

    useEffect(() => {
        if (!file) {
            setResult(null);
            return;
        }
        if ('parseError' in file) {
            setResult({status: 'rejected', issues: [{spec: null, message: 'The file is not valid JSON'}]});
            return;
        }
        let cancelled = false;
        setLoading(true);
        importSpecRequirements(regionId, file.parsed, mode, true)
            .then(res => {
                if (cancelled) return;
                if (!res.ok) {
                    setResult({status: 'rejected', issues: [{spec: null, message: res.error.message}]});
                    return;
                }
                setResult(res.value);
            })
            .catch(err => {
                if (cancelled) return;
                clientLogger.error('ImportDialog', 'Dry run failed', {error: err});
                setResult({status: 'rejected', issues: [{spec: null, message: 'Something went wrong reading the file'}]});
            })
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [file, mode, regionId]);

    const apply = async () => {
        if (!file || 'parseError' in file) return;
        setApplying(true);
        try {
            const res = await importSpecRequirements(regionId, file.parsed, mode, false);
            if (!res.ok) {
                clientLogger.error('ImportDialog', 'Import failed', {error: res.error});
                toast.error(`Failed to import into ${code}`, res.error.message);
                return;
            }
            if (res.value.status !== 'applied') {
                setResult(res.value);
                return;
            }
            const c = res.value.diff.counts;
            toast.success(`Imported into ${code}`, `${c.added} added, ${c.changed} changed, ${c.cleared} cleared`);
            onClose();
        } catch (err) {
            clientLogger.error('ImportDialog', 'Unexpected import error', {error: err});
            toast.error('Something went wrong');
        } finally {
            setApplying(false);
        }
    };

    const toggle = (id: string) =>
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const rejected = result?.status === 'rejected';
    const diff = result && result.status !== 'rejected' ? result.diff : null;
    const model = diff ? importPreviewModel(diff) : null;
    const issueGroups = result?.status === 'rejected' ? groupImportIssues(result.issues) : [];
    const issueCount = result?.status === 'rejected' ? result.issues.length : 0;

    return (
        <Dialog open={file !== null} onOpenChange={open => !open && !applying && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="sm:max-w-[680px] p-0 gap-0 rounded-sm flex flex-col max-h-[calc(100dvh-4rem)] overflow-hidden"
            >
                <div className="px-6 pt-5 pb-4 border-b border-border">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Import into</div>
                    <div className="flex items-center gap-4 mt-2">
                        <DialogTitle className="bg-secondary text-secondary-foreground font-mono text-2xl font-semibold px-3.5 py-1.5">
                            {code}
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="text-xs text-muted-foreground min-w-0">
                                <div className="font-mono text-sm text-foreground truncate">{file?.name}</div>
                                {rejected
                                    ? `File rejected · ${issueCount} ${issueCount === 1 ? 'problem' : 'problems'}`
                                    : diff
                                      ? `${diff.specs.length} specs in file · ${code} requirements for these specs will be replaced`
                                      : 'Reading file…'}
                            </div>
                        </DialogDescription>
                    </div>
                </div>

                {rejected ? (
                    <>
                        <div className="flex items-center gap-3 px-6 py-3 border-b border-border text-sm text-muted-foreground">
                            <X className="size-4 text-destructive shrink-0" />
                            <span>
                                <span className="text-foreground font-medium">Nothing was written.</span> {code} is unchanged and so is the file.
                            </span>
                        </div>
                        <div className="overflow-y-auto px-6 py-4 space-y-4">
                            {issueGroups.map(group => (
                                <div key={group.title}>
                                    <div className="text-sm font-semibold mb-1">{group.title}</div>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                        {group.messages.map((m, i) => (
                                            <li key={i}>{m}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 px-6 py-3.5 border-t border-border">
                            <p className="flex-1 text-xs text-muted-foreground">Fix the file and import it again.</p>
                            <Button size="sm" variant="ghost" className="rounded-sm" onClick={onClose}>
                                Close
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-sm" onClick={onChooseAnother}>
                                Choose another file
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-baseline gap-4 px-6 py-3.5 border-b border-border">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mode</span>
                            <span className="inline-flex gap-3 text-xs font-semibold tracking-wider" role="group" aria-label="Import mode">
                                {MODES.map(m => (
                                    <button
                                        key={m.value}
                                        type="button"
                                        aria-pressed={mode === m.value}
                                        disabled={applying}
                                        onClick={() => mode !== m.value && setMode(m.value)}
                                        className={cn(
                                            'uppercase py-0.5 border-b transition-colors',
                                            mode === m.value
                                                ? 'text-foreground border-foreground'
                                                : 'text-muted-foreground border-transparent hover:text-foreground'
                                        )}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </span>
                            <p className="flex-1 text-sm text-muted-foreground">
                                {mode === 'shape'
                                    ? `Takes the file's requirement lists and tiers. Keeps ${code}'s current thresholds; new requirements start unset.`
                                    : `Writes the file's thresholds over ${code}'s for every listed spec.`}
                            </p>
                        </div>

                        {diff && model ? (
                            <>
                                <div className="flex flex-wrap gap-5 px-6 py-3 border-b border-border text-xs text-muted-foreground">
                                    <Count n={diff.counts.added} label="added" />
                                    <Count n={diff.counts.changed} label="changed" />
                                    <Count n={diff.counts.cleared} label="cleared" danger={diff.counts.cleared > 0} />
                                    <Count n={diff.counts.unchanged} label="unchanged" />
                                    <Count n={diff.unsetCount} label="unset after import" />
                                </div>
                                <div className={cn('overflow-y-auto min-h-0', loading && 'opacity-50')}>
                                    {model.listed.map(spec => (
                                        <SpecDiffRow
                                            key={spec.specId}
                                            spec={spec}
                                            open={expanded.has(spec.specId)}
                                            onToggle={() => toggle(spec.specId)}
                                        />
                                    ))}
                                    {model.unchanged.length > 0 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => toggle('__unchanged__')}
                                                aria-expanded={expanded.has('__unchanged__')}
                                                className="grid grid-cols-[16px_1fr] gap-2 items-center w-full h-10 px-6 text-left text-sm text-muted-foreground border-b border-border/50 hover:bg-muted/20"
                                            >
                                                <ChevronRight
                                                    className={cn('size-3.5 transition-transform', expanded.has('__unchanged__') && 'rotate-90')}
                                                />
                                                <span>
                                                    <span className="font-mono tabular-nums">{model.unchanged.length}</span> unchanged
                                                </span>
                                            </button>
                                            {expanded.has('__unchanged__') && (
                                                <div className="px-12 py-2.5 text-sm text-muted-foreground border-b border-border/50 bg-muted/20">
                                                    {model.unchanged.map(s => s.specName).join(', ')}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="h-40 m-6 bg-muted/40 animate-pulse" />
                        )}

                        <div className="flex items-center gap-2 px-6 py-3.5 border-t border-border">
                            <p className="flex-1 text-xs text-muted-foreground">
                                Nothing is written until you confirm. Specs not in the file are untouched.
                            </p>
                            <Button size="sm" variant="ghost" className="rounded-sm" onClick={onClose} disabled={applying}>
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                variant={diff && diff.counts.cleared > 0 ? 'destructive' : 'default'}
                                className="rounded-sm"
                                onClick={apply}
                                disabled={!model || loading || applying || model.replaceCount === 0}
                            >
                                {applying
                                    ? 'Importing…'
                                    : model && model.replaceCount === 0
                                      ? `No changes for ${code}`
                                      : `Replace ${model?.replaceCount ?? 0} ${model?.replaceCount === 1 ? 'spec' : 'specs'} in ${code}`}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

function Count({n, label, danger}: {n: number; label: string; danger?: boolean}) {
    return (
        <span className={cn(danger && 'text-destructive')}>
            <span className={cn('font-mono tabular-nums text-sm mr-1', danger ? 'text-destructive' : 'text-foreground')}>{n}</span>
            {label}
        </span>
    );
}

function SpecDiffRow({spec, open, onToggle}: {spec: SpecImportSpecDiff; open: boolean; onToggle: () => void}) {
    const s = summarizeSpecDiff(spec);
    const pieces: {text: string; danger?: boolean}[] = [];
    if (spec.status === 'cleared') pieces.push({text: `clears ${s.removed}`, danger: true});
    else {
        if (s.values > 0) pieces.push({text: `${s.values} ${s.values === 1 ? 'value' : 'values'}`});
        if (s.added > 0) pieces.push({text: spec.status === 'added' && spec.unsetCount === s.added ? `${s.added} added, all unset` : `${s.added} added`});
        if (s.tiers > 0) pieces.push({text: `${s.tiers} ${s.tiers === 1 ? 'tier' : 'tiers'}`});
        if (s.removed > 0) pieces.push({text: `${s.removed} removed`, danger: true});
        if (spec.secondaryBefore !== spec.secondaryAfter) pieces.push({text: `need ${spec.secondaryBefore} → ${spec.secondaryAfter}`});
    }

    return (
        <>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="grid grid-cols-[16px_1fr_auto] gap-2 items-center w-full h-10 px-6 text-left border-b border-border/50 hover:bg-muted/20"
            >
                <ChevronRight className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
                <span className="text-sm truncate">{spec.specName}</span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {pieces.map((p, i) => (
                        <span key={i} className={cn(p.danger && 'text-destructive')}>
                            {p.text}
                        </span>
                    ))}
                    <span
                        className={cn(
                            'text-xs font-semibold uppercase tracking-wider',
                            spec.status === 'cleared' ? 'text-destructive normal-case tracking-normal font-normal' : 'text-muted-foreground'
                        )}
                    >
                        {spec.status}
                    </span>
                </span>
            </button>
            {open && (
                <div className="pl-12 pr-6 py-1.5 border-b border-border/50 bg-muted/20">
                    <table className="w-full text-sm">
                        <tbody>
                            {spec.changes.map(c => (
                                <ChangeRow key={c.statKey} change={c} />
                            ))}
                            {spec.secondaryBefore !== spec.secondaryAfter && (
                                <tr className="h-8">
                                    <td>Secondary need</td>
                                    <td />
                                    <td className="text-right font-mono tabular-nums">{spec.secondaryBefore}</td>
                                    <td className="w-6 text-center text-muted-foreground">→</td>
                                    <td className="text-right font-mono tabular-nums">{spec.secondaryAfter}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}

function ChangeRow({change}: {change: SpecStatChange}) {
    const {statKey, before, after} = change;
    const value = (v: number | null) =>
        v === null ? <span className="text-muted-foreground">unset</span> : formatThreshold(statKey, v);
    const tier = after?.tier ?? before?.tier ?? 'main';
    const tierText = before && after && before.tier !== after.tier ? `${TIER_SHORT[after.tier]} ← ${TIER_SHORT[before.tier]}` : TIER_SHORT[tier];

    return (
        <tr className="h-8">
            <td>{specStatLabel(statKey)}</td>
            <td className="text-xs font-semibold tracking-wider text-muted-foreground">{tierText}</td>
            <td className="text-right font-mono tabular-nums">
                {!before ? (
                    <span className="text-muted-foreground">·</span>
                ) : !after ? (
                    <s className="text-destructive">{before.value === null ? 'unset' : formatThreshold(statKey, before.value)}</s>
                ) : (
                    value(before.value)
                )}
            </td>
            <td className="w-6 text-center text-muted-foreground">→</td>
            <td className="text-right font-mono tabular-nums">
                {!after ? <span className="text-destructive font-sans">removed</span> : value(after.value)}
            </td>
        </tr>
    );
}
