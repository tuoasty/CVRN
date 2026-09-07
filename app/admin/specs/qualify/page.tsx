'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {ArrowLeft, Save, SlidersHorizontal} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import {Input} from '@/app/components/ui/input';
import {Label} from '@/app/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/app/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {useAdminContextStore} from '@/app/stores/adminContextStore';
import {useSpecs, useSpecLeaderboard, useSpecBonus, saveSpec} from '@/app/hooks/useSpecs';
import SpecThresholdEditor, {DraftThreshold} from '@/app/features/spec/SpecThresholdEditor';
import PlacementBonusEditor from '@/app/features/spec/PlacementBonusEditor';
import SpecQualificationTable from '@/app/features/spec/SpecQualificationTable';
import SpecSelector from '@/app/features/spec/SpecSelector';
import {evaluateSpecQualification} from '@/server/domains/spec/helpers/evaluateSpecQualification';
import {
    SpecTier,
    SpecPosition,
    SpecRequirementInput,
    SpecWithRequirements,
    PlacementBonusConfig,
    DEFAULT_PLACEMENT_BONUS,
    specStatMeta,
    isLowerIsBetterStatKey,
} from '@/server/domains/spec/types';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';

const newRowId = () => Math.random().toString(36).slice(2);

export default function AdminSpecQualifyPage() {
    const seasonId = useAdminContextStore(s => s.selectedSeasonId);
    const regionId = useAdminContextStore(s => s.selectedRegionId);
    const {specs} = useSpecs();

    const {
        config: savedBonus,
        isCustom: bonusIsCustom,
        save: saveBonus,
        reset: resetBonus,
    } = useSpecBonus(regionId);
    const [bonusDraft, setBonusDraft] = useState<PlacementBonusConfig | null>(null);
    const [bonusSaving, setBonusSaving] = useState(false);
    useEffect(() => {
        setBonusDraft(savedBonus);
    }, [savedBonus]);
    const activeBonus = bonusDraft ?? savedBonus ?? DEFAULT_PLACEMENT_BONUS;
    const bonusDirty =
        bonusDraft !== null &&
        JSON.stringify(bonusDraft) !== JSON.stringify(savedBonus ?? DEFAULT_PLACEMENT_BONUS);

    const [specId, setSpecId] = useState<string>('');
    const [thresholds, setThresholds] = useState<DraftThreshold[]>([]);
    const [secondaryRequired, setSecondaryRequired] = useState(0);
    const [stars, setStars] = useState(5);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    const [pendingSpec, setPendingSpec] = useState<SpecWithRequirements | null>(null);

    const selectedSpec = specs.find(s => s.id === specId) ?? null;

    const {
        matchedRows,
        fallbackRows,
        placeByTeamId,
        upperFinalistTeamId,
        isLoading: playersLoading,
        error,
    } = useSpecLeaderboard(seasonId, selectedSpec?.position ?? null);

    const placeMap = useMemo(() => new Map(Object.entries(placeByTeamId)), [placeByTeamId]);
    const placeGroupSize = useMemo(() => {
        const m = new Map<number, number>();
        for (const place of Object.values(placeByTeamId)) m.set(place, (m.get(place) ?? 0) + 1);
        return m;
    }, [placeByTeamId]);
    const hasPodium = Object.keys(placeByTeamId).length > 0;
    const hasUpperBand = upperFinalistTeamId !== null;

    const loadSpec = (spec: SpecWithRequirements) => {
        setSpecId(spec.id);
        setThresholds(
            spec.requirements.map(r => ({
                rowId: newRowId(),
                tier: r.tier as SpecTier,
                statKey: r.stat_key,
                minValue: Number(r.min_value),
            }))
        );
        setSecondaryRequired(spec.secondary_required);
        setStars(spec.stars);
        setDirty(false);
    };

    const handlePick = (spec: SpecWithRequirements) => {
        if (spec.id === specId) return;
        if (dirty && specId) {
            setPendingSpec(spec);
            return;
        }
        loadSpec(spec);
    };

    const confirmDiscard = () => {
        if (pendingSpec) loadSpec(pendingSpec);
        setPendingSpec(null);
    };

    const mainRows = thresholds.filter(t => t.tier === 'main');
    const secondaryRows = thresholds.filter(t => t.tier === 'secondary');

    const takenKeys = useMemo(
        () => new Set(thresholds.map(t => t.statKey).filter(Boolean)),
        [thresholds]
    );

    const matchedEval = useMemo(
        () =>
            evaluateSpecQualification(
                matchedRows,
                thresholds.filter(t => t.statKey).map(({tier, statKey, minValue}) => ({tier, statKey, minValue})),
                secondaryRequired,
                {bonusConfig: activeBonus, placeByTeamId: placeMap, upperFinalistTeamId}
            ),
        [matchedRows, thresholds, secondaryRequired, placeMap, upperFinalistTeamId, activeBonus]
    );

    const fallbackEval = useMemo(
        () =>
            evaluateSpecQualification(
                fallbackRows,
                thresholds.filter(t => t.statKey).map(({tier, statKey, minValue}) => ({tier, statKey, minValue})),
                secondaryRequired,
                {bonusConfig: activeBonus, placeByTeamId: placeMap, upperFinalistTeamId}
            ),
        [fallbackRows, thresholds, secondaryRequired, placeMap, upperFinalistTeamId, activeBonus]
    );

    const passCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const t of thresholds) {
            if (!t.statKey) continue;
            const solo = evaluateSpecQualification(
                matchedRows,
                [{tier: 'main', statKey: t.statKey, minValue: t.minValue}],
                0,
                {bonusConfig: activeBonus, placeByTeamId: placeMap, upperFinalistTeamId}
            );
            counts.set(t.rowId, solo.rows.filter(r => r.qualified).length);
        }
        return counts;
    }, [matchedRows, thresholds, placeMap, upperFinalistTeamId, activeBonus]);

    const statKeys = thresholds.filter(t => t.statKey).map(t => t.statKey);
    const qualifiedCount = matchedEval.rows.filter(r => r.qualified).length;

    const thresholdByKey = useMemo(() => {
        const m = new Map<string, {minValue: number; format: string; lowerIsBetter: boolean}>();
        for (const t of thresholds) {
            if (!t.statKey) continue;
            m.set(t.statKey, {
                minValue: t.minValue,
                format: specStatMeta(t.statKey)?.format ?? 'count',
                lowerIsBetter: isLowerIsBetterStatKey(t.statKey),
            });
        }
        return m;
    }, [thresholds]);

    const updateRow = (rowId: string, patch: Partial<DraftThreshold>) => {
        setThresholds(ts => ts.map(t => (t.rowId === rowId ? {...t, ...patch} : t)));
        setDirty(true);
    };
    const removeRow = (rowId: string) => {
        setThresholds(ts => ts.filter(t => t.rowId !== rowId));
        setDirty(true);
    };
    const addRow = (tier: SpecTier) => {
        setThresholds(ts => [...ts, {rowId: newRowId(), tier, statKey: '', minValue: 0}]);
        setDirty(true);
    };

    const saveError = (() => {
        if (!selectedSpec) return 'Pick a spec to save into';
        if (thresholds.some(t => !t.statKey)) return 'Every requirement needs a stat';
        if (thresholds.some(t => !Number.isFinite(t.minValue))) return 'Every requirement needs a number';
        if (secondaryRequired > secondaryRows.length) {
            return `Requires ${secondaryRequired} of ${secondaryRows.length} secondary — nobody could qualify`;
        }
        return null;
    })();

    const handleSave = async () => {
        if (!selectedSpec) return;
        if (saveError) {
            toast.error(saveError);
            return;
        }
        setSaving(true);
        try {
            const result = await saveSpec({
                id: selectedSpec.id,
                name: selectedSpec.name,
                stars,
                position: selectedSpec.position as SpecPosition,
                height: selectedSpec.height,
                secondaryRequired,
                requirements: thresholds
                    .filter(t => t.statKey)
                    .map(({tier, statKey, minValue}) => ({
                        tier,
                        statKey: statKey as SpecRequirementInput['statKey'],
                        minValue,
                    })),
            });
            if (!result.ok) {
                clientLogger.error('SpecQualifyPage', 'Failed to save spec', {error: result.error});
                toast.error('Failed to save', result.error.message);
                return;
            }
            toast.success('Spec updated');
            setDirty(false);
        } catch (err) {
            clientLogger.error('SpecQualifyPage', 'Exception saving spec', {err});
            toast.error('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const handleBonusSave = async () => {
        if (!bonusDraft) return;
        setBonusSaving(true);
        try {
            const result = await saveBonus(bonusDraft);
            if (!result.ok) {
                toast.error('Failed to save bonuses', result.error.message);
                return;
            }
            toast.success('Placement bonuses saved');
        } finally {
            setBonusSaving(false);
        }
    };

    const handleBonusReset = async () => {
        setBonusSaving(true);
        try {
            const result = await resetBonus();
            if (!result.ok) {
                toast.error('Failed to reset bonuses', result.error.message);
                return;
            }
            setBonusDraft(DEFAULT_PLACEMENT_BONUS);
            toast.success('Placement bonuses reset to defaults');
        } finally {
            setBonusSaving(false);
        }
    };

    return (
        <div className="w-full px-3 sm:px-4 py-6">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <SlidersHorizontal className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider">Spec Calibration</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Tune thresholds against a season and see who clears them. Save writes back to the selected spec.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            onClick={handleSave}
                            disabled={!selectedSpec || !!saveError || saving}
                            className="rounded-sm gap-1"
                            title={!selectedSpec ? 'Pick a spec to save into' : saveError ?? undefined}
                        >
                            <Save className="h-4 w-4" />
                            {saving ? 'Saving…' : 'Save'}
                        </Button>
                        <Button asChild variant="outline" className="rounded-sm gap-1">
                            <Link href="/admin/specs">
                                <ArrowLeft className="h-4 w-4" />
                                Catalog
                            </Link>
                        </Button>
                    </div>
                </div>

                {!seasonId && (
                    <div className="panel p-6 mt-6 text-center">
                        <p className="text-muted-foreground">Select a season to calibrate against.</p>
                    </div>
                )}

                {seasonId && error && (
                    <div className="panel p-6 mt-6 text-center">
                        <p className="text-destructive text-sm">{error}</p>
                    </div>
                )}

                {seasonId && !error && (
                    <>
                        <div className="flex items-center gap-3 mt-6 mb-3 flex-wrap">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Selected:</span>
                                {selectedSpec ? (
                                    <>
                                        <span className="font-semibold">{selectedSpec.name}</span>
                                        <span className="rounded-full border border-border px-1.5 text-xs font-semibold">
                                            {selectedSpec.position}
                                        </span>
                                        <span className="font-mono tabular-nums text-xs text-primary">
                                            {selectedSpec.stars}★
                                        </span>
                                        {dirty && (
                                            <span className="text-xs text-muted-foreground">· unsaved edits</span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">none</span>
                                )}
                            </div>
                            <div className="ml-auto text-sm text-muted-foreground">
                                <span className="font-mono tabular-nums text-lg font-semibold text-primary">
                                    {qualifiedCount}
                                </span>{' '}
                                of {matchedEval.rows.length} qualify
                            </div>
                        </div>

                        {matchedEval.unknownStatKeys.length > 0 && (
                            <p className="text-xs text-destructive mb-3">
                                Unrecognised stat{matchedEval.unknownStatKeys.length === 1 ? '' : 's'}:{' '}
                                <span className="font-mono">{matchedEval.unknownStatKeys.join(', ')}</span>. Nobody
                                qualifies until these are fixed.
                            </p>
                        )}

                        <div className="grid grid-cols-[266px_1fr] border border-border rounded-sm overflow-hidden min-h-[520px]">
                            <div className="border-r border-border bg-muted/20 overflow-y-auto">
                                <div className="p-3 space-y-4">
                                    <SpecSelector
                                        specs={specs}
                                        activeId={specId || null}
                                        onPick={handlePick}
                                    />
                                    <PlacementBonusEditor
                                        value={activeBonus}
                                        isCustom={bonusIsCustom}
                                        dirty={bonusDirty}
                                        saving={bonusSaving}
                                        disabled={!regionId}
                                        onChange={setBonusDraft}
                                        onSave={handleBonusSave}
                                        onReset={handleBonusReset}
                                    />

                                    {selectedSpec ? (
                                        <>
                                        <div className="flex items-center justify-between gap-2">
                                            <Label htmlFor="qualify-stars">Star tier</Label>
                                            <Select
                                                value={String(stars)}
                                                onValueChange={v => {
                                                    setStars(Number(v));
                                                    setDirty(true);
                                                }}
                                            >
                                                <SelectTrigger id="qualify-stars" className="rounded-sm text-sm w-24">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-sm">
                                                    {[3, 4, 5].map(s => (
                                                        <SelectItem key={s} value={String(s)} className="rounded-sm text-sm">
                                                            {s} ★
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <div>
                                                <Label>Main requirements</Label>
                                                <p className="text-xs text-muted-foreground mt-1">All must be cleared.</p>
                                            </div>
                                            <SpecThresholdEditor
                                                tier="main"
                                                rows={mainRows}
                                                takenKeys={takenKeys}
                                                passCounts={passCounts}
                                                totalPlayers={matchedRows.length}
                                                onChange={updateRow}
                                                onRemove={removeRow}
                                                onAdd={addRow}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-end justify-between gap-2">
                                                <Label>Secondary</Label>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Label htmlFor="qualify-secondary-required" className="text-xs">
                                                        Need
                                                    </Label>
                                                    <Input
                                                        id="qualify-secondary-required"
                                                        type="number"
                                                        min={0}
                                                        max={secondaryRows.length}
                                                        value={String(secondaryRequired)}
                                                        onChange={e => {
                                                            setSecondaryRequired(Number(e.target.value));
                                                            setDirty(true);
                                                        }}
                                                        className="rounded-sm w-14 font-mono tabular-nums text-sm"
                                                    />
                                                    <span className="text-xs text-muted-foreground">
                                                        of {secondaryRows.length}
                                                    </span>
                                                </div>
                                            </div>
                                            <SpecThresholdEditor
                                                tier="secondary"
                                                rows={secondaryRows}
                                                takenKeys={takenKeys}
                                                passCounts={passCounts}
                                                totalPlayers={matchedRows.length}
                                                onChange={updateRow}
                                                onRemove={removeRow}
                                                onAdd={addRow}
                                            />
                                        </div>

                                        <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-1">
                                            {!hasPodium && !hasUpperBand && (
                                                <p>
                                                    No podium or seeded final yet — placement bonuses are
                                                    inactive; everyone is treated as outside.
                                                </p>
                                            )}
                                            {!hasPodium && hasUpperBand && (
                                                <p>
                                                    No podium yet, but the upper-bracket finalist is seeded — they
                                                    receive the full +25% band; everyone else is outside.
                                                </p>
                                            )}
                                            {hasPodium && !hasUpperBand && (
                                                <p>
                                                    No upper-bracket finalist this season (single-elim, or the final
                                                    is not seeded yet). Nobody receives the +25% upper-final band.
                                                </p>
                                            )}
                                        </div>
                                        </>
                                    ) : (
                                        <p className="border-t border-border pt-3 text-center text-sm text-muted-foreground">
                                            Pick a spec above to calibrate its requirements.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-auto">
                                {!selectedSpec ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        Select a spec to evaluate players against its requirements.
                                    </div>
                                ) : playersLoading ? (
                                    <div className="p-6 text-center text-muted-foreground">Loading season stats…</div>
                                ) : (
                                    <SpecQualificationTable
                                        rows={matchedEval.rows}
                                        fallbackRows={fallbackEval.rows}
                                        matchedLabel={`Played ${selectedSpec.position}`}
                                        fallbackLabel="All players · season totals"
                                        statKeys={statKeys}
                                        thresholdByKey={thresholdByKey}
                                        placeGroupSize={placeGroupSize}
                                    />
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <AlertDialog open={!!pendingSpec} onOpenChange={o => { if (!o) setPendingSpec(null); }}>
                <AlertDialogContent className="rounded-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved edits to{' '}
                            <strong>{selectedSpec?.name}</strong>. Switching to{' '}
                            <strong>{pendingSpec?.name}</strong> will discard them.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm">Keep editing</AlertDialogCancel>
                        <AlertDialogAction className="rounded-sm" onClick={confirmDiscard}>
                            Discard &amp; switch
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
