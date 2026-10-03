'use client';

import {useRef, useState} from 'react';
import Link from 'next/link';
import {Award, Plus, SlidersHorizontal, Upload, EyeOff, Download, FileUp} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import PositionRail from '@/app/features/spec/PositionRail';
import SpecCard from '@/app/features/spec/SpecCard';
import SpecEditPane from '@/app/features/spec/SpecEditPane';
import {useSpecs, exportSpecRequirements, importSpecRequirements} from '@/app/hooks/useSpecs';
import {clientLogger} from '@/app/utils/clientLogger';
import {SpecImportMode, SpecImportRegionDiff} from '@/server/domains/spec/types';
import {useAdminContextStore} from '@/app/stores/adminContextStore';
import {useRegions} from '@/app/hooks/useRegions';
import {SpecPosition, positionLabel} from '@/server/domains/spec/types';
import {generateSpecSnapshotAction, deleteSpecSnapshotAction} from '@/app/actions/spec.actions';
import {toast} from '@/app/utils/toast';

function summarizeDiff(d: SpecImportRegionDiff): string {
    const c = d.counts;
    return `${c.added} added, ${c.changed} changed, ${c.cleared} cleared, ${c.unchanged} unchanged, ${d.unsetCount} unset values`;
}

export default function AdminSpecsPage() {
    const regionId = useAdminContextStore(s => s.selectedRegionId);
    const {specs, isLoading, error} = useSpecs(regionId);
    const {regions} = useRegions();
    const regionCode = regions.find(r => r.id === regionId)?.code ?? '';

    const [active, setActive] = useState<SpecPosition | 'ALL'>('ALL');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [unpublishing, setUnpublishing] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importModeRef = useRef<SpecImportMode>('full');

    const pickImportFile = (mode: SpecImportMode) => {
        importModeRef.current = mode;
        fileInputRef.current?.click();
    };

    const handleExport = async () => {
        if (!regionId) return;
        setTransferring(true);
        try {
            const result = await exportSpecRequirements(regionId);
            if (!result.ok) {
                toast.error('Failed to export', result.error.message);
                return;
            }
            const blob = new Blob([JSON.stringify(result.value.file, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.value.filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Something went wrong');
        } finally {
            setTransferring(false);
        }
    };

    const handleImportFile = async (fileList: FileList | null) => {
        const picked = fileList?.[0];
        if (fileInputRef.current) fileInputRef.current.value = '';
        const targetRegionId = regionId;
        const mode = importModeRef.current;
        if (!picked || !targetRegionId) return;
        setTransferring(true);
        try {
            let parsed: unknown;
            try {
                parsed = JSON.parse(await picked.text());
            } catch {
                toast.error('Import rejected', 'The file is not valid JSON');
                return;
            }
            const preview = await importSpecRequirements(targetRegionId, parsed, mode, true);
            if (!preview.ok) {
                toast.error('Failed to import', preview.error.message);
                return;
            }
            if (preview.value.status === 'rejected') {
                clientLogger.warn('AdminSpecsPage', 'Import rejected', {issues: preview.value.issues});
                toast.error(
                    'Import rejected',
                    `${preview.value.issues.length} problem${preview.value.issues.length === 1 ? '' : 's'}. First: ${preview.value.issues[0]?.message ?? ''}. Full list in the console.`,
                );
                return;
            }
            if (preview.value.status !== 'preview') return;
            const diff = preview.value.diff;
            clientLogger.info('AdminSpecsPage', 'Import preview', {diff});
            const modeLine =
                mode === 'shape'
                    ? 'Shape only: requirement lists and tiers from the file, existing thresholds kept, new requirements added as unset.'
                    : 'Full: requirement lists and thresholds from the file.';
            if (!window.confirm(`Import into ${diff.regionCode}? This replaces ${diff.regionCode} requirements for the listed specs.\n${modeLine}\n\n${summarizeDiff(diff)}`)) return;

            const applied = await importSpecRequirements(targetRegionId, parsed, mode, false);
            if (!applied.ok) {
                toast.error('Failed to import', applied.error.message);
                return;
            }
            if (applied.value.status === 'applied') {
                toast.success(`Imported into ${applied.value.diff.regionCode}`, summarizeDiff(applied.value.diff));
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setTransferring(false);
        }
    };

    const visibleSpecs = active === 'ALL' ? specs : specs.filter(s => s.position === active);
    const selectedSpec = specs.find(s => s.id === selectedId) ?? null;

    const selectSpec = (id: string) => {
        setSelectedId(id);
        setCreating(false);
    };

    const startCreate = () => {
        setCreating(true);
        setSelectedId(null);
    };

    const handleSaved = () => {
        setCreating(false);
    };

    const handleDeleted = () => {
        setSelectedId(null);
        setCreating(false);
    };

    const handlePublish = async () => {
        if (!regionId) return;
        setPublishing(true);
        try {
            const result = await generateSpecSnapshotAction(regionId);
            if (!result.ok) {
                toast.error('Failed to publish', result.error.message);
                return;
            }
            const {specCount, statCount, skippedSpecs} = result.value;
            const summary = `${specCount} spec${specCount === 1 ? '' : 's'} · ${statCount} stats ranked`;
            if (skippedSpecs.length > 0) {
                toast.warning(
                    `Published ${regionCode}, ${skippedSpecs.length} skipped`,
                    `${summary}. Skipped for unset values: ${skippedSpecs.join(', ')}`,
                );
            } else {
                toast.success(`Published ${regionCode}`, summary);
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setPublishing(false);
        }
    };

    const handleUnpublish = async () => {
        if (!regionId) return;
        setUnpublishing(true);
        try {
            const result = await deleteSpecSnapshotAction(regionId);
            if (!result.ok) {
                toast.error('Failed to unpublish', result.error.message);
                return;
            }
            toast.success(`Unpublished ${regionCode}`, `${regionCode} no longer appears on the public page`);
        } catch {
            toast.error('Something went wrong');
        } finally {
            setUnpublishing(false);
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <Award className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider">Specs</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            The spec catalog and the stat thresholds a player must clear to qualify
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button onClick={startCreate} className="rounded-sm gap-1">
                            <Plus className="h-4 w-4" />
                            New Spec
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={transferring || !regionId}
                            variant="ghost"
                            className="rounded-sm gap-1"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                        <Button
                            onClick={() => pickImportFile('full')}
                            disabled={transferring || !regionId}
                            variant="ghost"
                            className="rounded-sm gap-1"
                            title="Requirement lists and thresholds from the file"
                        >
                            <FileUp className="h-4 w-4" />
                            Import full
                        </Button>
                        <Button
                            onClick={() => pickImportFile('shape')}
                            disabled={transferring || !regionId}
                            variant="ghost"
                            className="rounded-sm gap-1"
                            title="Requirement lists and tiers from the file; existing thresholds kept, new ones unset"
                        >
                            <FileUp className="h-4 w-4" />
                            Import shape
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onChange={e => handleImportFile(e.target.files)}
                        />
                        <Button asChild variant="outline" className="rounded-sm gap-1">
                            <Link href="/admin/specs/qualify">
                                <SlidersHorizontal className="h-4 w-4" />
                                Calibrate
                            </Link>
                        </Button>
                        <Button
                            onClick={handlePublish}
                            disabled={publishing || !regionId}
                            variant="outline"
                            className="rounded-sm gap-1"
                        >
                            <Upload className="h-4 w-4" />
                            {publishing ? 'Publishing…' : `Publish ${regionCode}`}
                        </Button>
                        <Button
                            onClick={handleUnpublish}
                            disabled={unpublishing || !regionId}
                            variant="ghost"
                            className="rounded-sm gap-1 text-muted-foreground"
                        >
                            <EyeOff className="h-4 w-4" />
                            {unpublishing ? 'Unpublishing…' : `Unpublish ${regionCode}`}
                        </Button>
                    </div>
                </div>

                {!regionId ? (
                    <div className="panel p-6 mt-6 text-center">
                        <p className="text-muted-foreground text-sm">Select a region to edit its requirements.</p>
                    </div>
                ) : error ? (
                    <div className="panel p-6 mt-6 text-center">
                        <p className="text-destructive text-sm">{error}</p>
                    </div>
                ) : (
                    <div className="mt-6 grid grid-cols-[minmax(96px,10%)_1fr_minmax(300px,30%)] border border-border rounded-sm overflow-hidden min-h-[560px]">
                        <div className="border-r border-border bg-muted/30 overflow-y-auto">
                            <PositionRail specs={specs} active={active} onSelect={setActive} />
                        </div>

                        <div className="grid grid-cols-3 gap-2 p-3 content-start overflow-y-auto">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <div key={i} className="panel w-full h-48 animate-pulse bg-muted/40" />
                                ))
                            ) : visibleSpecs.length === 0 ? (
                                <div className="col-span-3 text-center text-sm text-muted-foreground py-10">
                                    No specs in {active === 'ALL' ? 'the catalog' : positionLabel(active)} yet — use
                                    New Spec to add one.
                                </div>
                            ) : (
                                visibleSpecs.map(spec => (
                                    <SpecCard
                                        key={spec.id}
                                        spec={spec}
                                        selected={spec.id === selectedId && !creating}
                                        onClick={() => selectSpec(spec.id)}
                                    />
                                ))
                            )}
                        </div>

                        <div className="border-l border-border bg-muted/20 overflow-y-auto">
                            {creating ? (
                                <SpecEditPane spec={null} mode="create" regionId={regionId} onSaved={handleSaved} onDeleted={handleDeleted} />
                            ) : selectedSpec ? (
                                <SpecEditPane
                                    spec={selectedSpec}
                                    mode="edit"
                                    regionId={regionId}
                                    onSaved={handleSaved}
                                    onDeleted={handleDeleted}
                                />
                            ) : (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    Select a spec, or ＋ to create one.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <p className="text-xs text-muted-foreground/70 mt-4">
                    Thresholds are admin-only — <span className="font-mono">spec_requirements</span> has
                    no public read policy.
                </p>
            </div>
        </div>
    );
}
