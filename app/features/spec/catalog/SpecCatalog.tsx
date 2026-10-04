'use client';

import {useCallback, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useRegions} from '@/app/hooks/useRegions';
import {deleteSpec, saveRegionRequirements, useSpecsAllRegions} from '@/app/hooks/useSpecs';
import {useAdminContextStore} from '@/app/stores/adminContextStore';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';
import {SpecPosition, SpecWithAllRegions, isSpecStatKey, positionLabel} from '@/server/domains/spec/types';
import SpecCatalogHeader from './SpecCatalogHeader';
import SpecCatalogList from './SpecCatalogList';
import SpecBandList from './SpecBandList';
import StatList from './StatList';
import ByStatView from './ByStatView';
import {statCoverage} from './statView';
import BySpecView, {RegionColumn} from './BySpecView';
import SpecIdentityForm from './SpecIdentityForm';
import DraftSaveBar from './DraftSaveBar';
import ConfirmDialog from './ConfirmDialog';
import ImportDialog, {ImportFile} from './ImportDialog';
import {useSpecPublishing} from './useSpecPublishing';
import {unpublishableSpecNames} from './transfer';
import {useSpecCatalogUrl} from './useSpecCatalogUrl';
import {orderRegions} from './catalogParams';
import {useRegionDraft} from './useRegionDraft';
import {useLeaveGuard} from './useLeaveGuard';
import {RegionState, buildRegionState, groupByStars} from './catalogState';
import {buildSavePayload} from './regionDraft';

type Pending =
    | {kind: 'region'; code: string}
    | {kind: 'leave'; href: string}
    | {kind: 'delete'; spec: SpecWithAllRegions}
    | {kind: 'import'}
    | {kind: 'unpublish'}
    | null;

const EMPTY_STATE: RegionState = {};

export default function SpecCatalog() {
    const router = useRouter();
    const {regions: rawRegions, error: regionsError} = useRegions();
    const regions = useMemo(() => orderRegions(rawRegions), [rawRegions]);
    const storeRegionId = useAdminContextStore(s => s.selectedRegionId);
    const {params, region, setRegion, setView, setPos, selectSpec, selectStat} = useSpecCatalogUrl(regions, storeRegionId);
    const {specs, isLoading, error} = useSpecsAllRegions();

    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [pending, setPending] = useState<Pending>(null);
    const [importFile, setImportFile] = useState<ImportFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const statesByRegion = useMemo(() => {
        const out: Record<string, RegionState> = {};
        for (const r of regions) out[r.id] = buildRegionState(specs, r.id);
        return out;
    }, [specs, regions]);

    const regionId = region?.id ?? null;
    const baseline = (regionId && statesByRegion[regionId]) || EMPTY_STATE;
    const {draft, edit, discard, discardSpec, summary, stateOf, dirty} = useRegionDraft(regionId, baseline);

    const publishing = useSpecPublishing(regionId, region?.code ?? '');
    const unsetSpecNames = useMemo(() => unpublishableSpecNames(specs, baseline), [specs, baseline]);

    const blockLeave = useCallback((href: string) => setPending({kind: 'leave', href}), []);
    useLeaveGuard(dirty, blockLeave);

    if (regionsError || error) {
        return (
            <div className="panel p-6 text-center">
                <p className="text-destructive text-sm">{regionsError ?? error}</p>
            </div>
        );
    }

    if (!params || !region) {
        return <div className="panel h-[560px] animate-pulse bg-muted/40" />;
    }

    const code = params.region.toUpperCase();
    const columns: RegionColumn[] = regions.map(r => ({
        id: r.id,
        code: r.code,
        state: statesByRegion[r.id] ?? EMPTY_STATE,
        current: r.id === region.id,
    }));

    const positionSpecs = specs.filter(s => s.position === params.pos);
    const bands = groupByStars(positionSpecs);
    const selectedSpec = positionSpecs.find(s => s.id === params.spec) ?? bands[0]?.items[0] ?? null;
    const listState: RegionState = {...baseline, ...draft};
    const coverage = statCoverage(positionSpecs.map(s => s.id), listState);
    const requestedStat = params.stat && isSpecStatKey(params.stat) ? params.stat : null;
    const selectedStat = requestedStat ?? coverage[0]?.statKey ?? null;

    const requestRegion = (nextCode: string) => {
        if (dirty) setPending({kind: 'region', code: nextCode});
        else setRegion(nextCode);
    };

    const pickImportFile = () => {
        if (fileInputRef.current) fileInputRef.current.value = '';
        fileInputRef.current?.click();
    };

    const requestImport = () => {
        if (dirty) setPending({kind: 'import'});
        else pickImportFile();
    };

    const readImportFile = async (files: FileList | null) => {
        const picked = files?.[0];
        if (!picked) return;
        const text = await picked.text();
        try {
            setImportFile({name: picked.name, parsed: JSON.parse(text)});
        } catch {
            setImportFile({name: picked.name, parseError: true});
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await saveRegionRequirements(buildSavePayload(region.id, baseline, draft));
            if (!result.ok) {
                clientLogger.error('SpecCatalog', 'Failed to save region requirements', {error: result.error});
                toast.error(`Failed to save ${code} requirements`, result.error.message);
                return;
            }
            toast.success(`Saved ${code} requirements`, `${summary.changes} changes across ${summary.specs} specs`);
            discard();
        } catch (err) {
            clientLogger.error('SpecCatalog', 'Unexpected error saving requirements', {error: err});
            toast.error('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (spec: SpecWithAllRegions) => {
        setDeleting(true);
        try {
            const result = await deleteSpec(spec.id);
            if (!result.ok) {
                clientLogger.error('SpecCatalog', 'Failed to delete spec', {error: result.error});
                toast.error('Failed to delete spec', result.error.message);
                return;
            }
            discardSpec(spec.id);
            setPending(null);
            setPos(params.pos);
            toast.success(`Deleted ${spec.name}`);
        } catch (err) {
            clientLogger.error('SpecCatalog', 'Unexpected error deleting spec', {error: err});
            toast.error('Something went wrong');
        } finally {
            setDeleting(false);
        }
    };

    const confirmPending = () => {
        if (!pending) return;
        if (pending.kind === 'delete') {
            void handleDelete(pending.spec);
            return;
        }
        if (pending.kind === 'unpublish') {
            void publishing.unpublish().then(ok => ok && setPending(null));
            return;
        }
        discard();
        setPending(null);
        if (pending.kind === 'region') setRegion(pending.code);
        else if (pending.kind === 'import') pickImportFile();
        else router.push(pending.href);
    };

    const specHasDraft = pending?.kind === 'delete' && pending.spec.id in draft;

    return (
        <>
            <SpecCatalogHeader
                regions={regions}
                regionCode={params.region}
                onRegion={requestRegion}
                view={params.view}
                onView={view => {
                    setCreating(false);
                    setView(view);
                }}
                onNewSpec={() => {
                    setCreating(true);
                    if (params.view !== 'spec') setView('spec');
                }}
                onExport={publishing.exportRegion}
                onImport={requestImport}
                onPublish={publishing.publish}
                onUnpublish={() => setPending({kind: 'unpublish'})}
                exporting={publishing.exporting}
                publishing={publishing.publishing}
                unpublishing={publishing.unpublishing}
                unsetSpecNames={unsetSpecNames}
                dirtyChanges={summary.changes}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={e => void readImportFile(e.target.files)}
            />
            <div className="mt-4 grid grid-cols-[260px_1fr] border border-border min-h-[560px]">
                <SpecCatalogList
                    pos={params.pos}
                    onPos={(pos: SpecPosition) => {
                        setCreating(false);
                        setPos(pos);
                    }}
                >
                    {isLoading ? (
                        <div className="p-3 space-y-2">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-6 bg-muted/40 animate-pulse" />
                            ))}
                        </div>
                    ) : params.view === 'spec' ? (
                        <SpecBandList
                            bands={bands}
                            state={listState}
                            selectedId={creating ? null : selectedSpec?.id ?? null}
                            onSelect={id => {
                                setCreating(false);
                                selectSpec(id);
                            }}
                        />
                    ) : (
                        <StatList
                            regionCode={params.region}
                            coverage={coverage}
                            total={positionSpecs.length}
                            selectedStat={selectedStat}
                            onSelect={selectStat}
                        />
                    )}
                </SpecCatalogList>
                <div className="flex flex-col min-w-0">
                    {isLoading ? (
                        <div className="m-5 h-64 bg-muted/40 animate-pulse" />
                    ) : creating ? (
                        <SpecIdentityForm
                            spec={null}
                            defaultPosition={params.pos}
                            onCancel={() => setCreating(false)}
                            onSaved={spec => {
                                setCreating(false);
                                selectSpec(spec.id, spec.position as SpecPosition);
                            }}
                        />
                    ) : params.view === 'stat' ? (
                        positionSpecs.length === 0 ? (
                            <div className="p-6 text-sm text-muted-foreground">
                                No {positionLabel(params.pos)} specs yet. Use + New spec to add one.
                            </div>
                        ) : selectedStat ? (
                            <ByStatView
                                key={selectedStat}
                                statKey={selectedStat}
                                pos={params.pos}
                                regionCode={params.region}
                                specs={positionSpecs}
                                columns={columns}
                                baseline={baseline}
                                stateOf={stateOf}
                                onEdit={edit}
                                onOpenSpec={id => selectSpec(id)}
                            />
                        ) : (
                            <div className="p-6 text-sm text-muted-foreground">
                                No {positionLabel(params.pos)} requirements in {code} yet. Pick a stat with + Add a stat.
                            </div>
                        )
                    ) : selectedSpec ? (
                        <BySpecView
                            key={selectedSpec.id}
                            spec={selectedSpec}
                            regionCode={params.region}
                            state={stateOf(selectedSpec.id)}
                            baseline={baseline[selectedSpec.id]}
                            columns={columns}
                            onEdit={change => edit(selectedSpec.id, change)}
                            onDelete={() => setPending({kind: 'delete', spec: selectedSpec})}
                            onDetailsSaved={spec => selectSpec(spec.id, spec.position as SpecPosition)}
                        />
                    ) : (
                        <div className="p-6 text-sm text-muted-foreground">
                            No {positionLabel(params.pos)} specs yet. Use + New spec to add one.
                        </div>
                    )}
                    {dirty && (
                        <DraftSaveBar
                            regionCode={params.region}
                            summary={summary}
                            saving={saving}
                            onDiscard={discard}
                            onSave={handleSave}
                        />
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={pending?.kind === 'region' || pending?.kind === 'leave'}
                title={`Discard ${summary.changes} unsaved ${summary.changes === 1 ? 'change' : 'changes'} in ${code}?`}
                description={
                    pending?.kind === 'region'
                        ? `Switching to ${pending.code.toUpperCase()} drops your ${code} draft. Save first to keep it.`
                        : `Leaving this page drops your ${code} draft. Save first to keep it.`
                }
                cancelLabel="Keep editing"
                confirmLabel="Discard"
                destructive
                onCancel={() => setPending(null)}
                onConfirm={confirmPending}
            />
            <ConfirmDialog
                open={pending?.kind === 'import'}
                title={`You have ${summary.changes} unsaved ${summary.changes === 1 ? 'change' : 'changes'} in ${code}`}
                description={`Importing replaces ${code} requirements. Your draft will be discarded.`}
                cancelLabel="Keep editing"
                confirmLabel="Discard and choose file"
                onCancel={() => setPending(null)}
                onConfirm={confirmPending}
            />
            <ConfirmDialog
                open={pending?.kind === 'unpublish'}
                title={`Remove ${code} from the public page?`}
                description="Requirements stay saved. Publish again any time."
                cancelLabel="Cancel"
                confirmLabel={publishing.unpublishing ? 'Unpublishing…' : `Unpublish ${code}`}
                destructive
                busy={publishing.unpublishing}
                onCancel={() => setPending(null)}
                onConfirm={confirmPending}
            />
            <ImportDialog
                file={importFile}
                regionId={region.id}
                regionCode={params.region}
                onClose={() => setImportFile(null)}
                onChooseAnother={() => {
                    setImportFile(null);
                    pickImportFile();
                }}
            />
            <ConfirmDialog
                open={pending?.kind === 'delete'}
                title={pending?.kind === 'delete' ? `Delete ${pending.spec.name}?` : ''}
                description={
                    <>
                        This removes the spec and its requirements in every region. It can&apos;t be undone.
                        {specHasDraft && ' Your unsaved changes to this spec are discarded too.'}
                    </>
                }
                cancelLabel="Cancel"
                confirmLabel={deleting ? 'Deleting…' : 'Delete spec'}
                destructive
                busy={deleting}
                onCancel={() => setPending(null)}
                onConfirm={confirmPending}
            />
        </>
    );
}
