'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {ArrowLeft, SlidersHorizontal} from 'lucide-react';
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
import {useAdminContextStore} from '@/app/stores/adminContextStore';
import {useSpecs, useSpecLeaderboard} from '@/app/hooks/useSpecs';
import SpecThresholdEditor, {DraftThreshold} from '@/app/features/spec/SpecThresholdEditor';
import SpecQualificationTable from '@/app/features/spec/SpecQualificationTable';
import {evaluateSpecQualification} from '@/server/domains/spec/helpers/evaluateSpecQualification';
import {SpecTier} from '@/server/domains/spec/types';

const newRowId = () => Math.random().toString(36).slice(2);

/**
 * Calibration scratchpad. Picking a spec copies its thresholds into local state;
 * everything after that is local. Nothing here writes — once the numbers look
 * right they get typed into the spec on /admin/specs.
 */
export default function AdminSpecQualifyPage() {
    const seasonId = useAdminContextStore(s => s.selectedSeasonId);
    const {specs, isLoading: specsLoading} = useSpecs();
    const {rows: players, placementTiers, isLoading: playersLoading, error} = useSpecLeaderboard(seasonId);

    const [specId, setSpecId] = useState<string>('');
    const [thresholds, setThresholds] = useState<DraftThreshold[]>([]);
    const [secondaryRequired, setSecondaryRequired] = useState(0);
    const [stars, setStars] = useState(5);
    const [dirty, setDirty] = useState(false);

    const selectedSpec = specs.find(s => s.id === specId) ?? null;

    // Placement bonus only needs team -> finals slot, and that is at most 3 or 4 rows.
    const tierByTeamId = useMemo(
        () => new Map(Object.entries(placementTiers)),
        [placementTiers]
    );

    // No upper finalist means the season ran a single-elim bracket (or has not reached
    // its final yet). Worth saying out loud — otherwise an admin sees a board with no
    // +15% anywhere and reads it as a bug.
    const hasUpperBand = Object.values(placementTiers).includes('upper_finalist');

    // Loading a spec resets the scratchpad to its saved numbers. Guarded on specId
    // rather than the spec object so a background SWR refresh does not wipe edits
    // in progress.
    useEffect(() => {
        const spec = specs.find(s => s.id === specId);
        if (!spec) {
            setThresholds([]);
            setSecondaryRequired(0);
            setDirty(false);
            return;
        }
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [specId]);

    const mainRows = thresholds.filter(t => t.tier === 'main');
    const secondaryRows = thresholds.filter(t => t.tier === 'secondary');

    const takenKeys = useMemo(
        () => new Set(thresholds.map(t => t.statKey).filter(Boolean)),
        [thresholds]
    );

    const evaluation = useMemo(
        () =>
            evaluateSpecQualification(
                players,
                thresholds.filter(t => t.statKey).map(({tier, statKey, minValue}) => ({tier, statKey, minValue})),
                secondaryRequired,
                {stars, tierByTeamId}
            ),
        [players, thresholds, secondaryRequired, stars, tierByTeamId]
    );

    // Per-requirement pass counts, evaluated in isolation so each threshold shows
    // how many players it alone admits. Carries the same placement bonus, or the
    // counts would not add up against the combined result.
    const passCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const t of thresholds) {
            if (!t.statKey) continue;
            const solo = evaluateSpecQualification(
                players,
                [{tier: 'main', statKey: t.statKey, minValue: t.minValue}],
                0,
                {stars, tierByTeamId}
            );
            counts.set(t.rowId, solo.rows.filter(r => r.qualified).length);
        }
        return counts;
    }, [players, thresholds, stars, tierByTeamId]);

    const statKeys = thresholds.filter(t => t.statKey).map(t => t.statKey);
    const qualifiedCount = evaluation.rows.filter(r => r.qualified).length;

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

    // Not admin-container: that is page-narrow, and a dozen stat columns need every
    // pixel. Full width with a minimal gutter instead.
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
                            Tune thresholds against a season and see who clears them. Nothing here saves.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="rounded-sm gap-1 shrink-0">
                        <Link href="/admin/specs">
                            <ArrowLeft className="h-4 w-4" />
                            Catalog
                        </Link>
                    </Button>
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
                        <div className="panel p-5 mt-6 space-y-5">
                            <div className="flex items-end gap-4 flex-wrap">
                                <div className="space-y-2 w-64">
                                    <Label htmlFor="spec-picker">Spec</Label>
                                    <Select value={specId} onValueChange={setSpecId} disabled={specsLoading}>
                                        <SelectTrigger id="spec-picker" className="rounded-sm text-sm">
                                            <SelectValue placeholder="Start from a spec…" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-sm">
                                            {specs.map(s => (
                                                <SelectItem key={s.id} value={s.id} className="rounded-sm text-sm">
                                                    {s.name} — {s.stars}★
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 w-32">
                                    <Label htmlFor="qualify-stars">Star tier</Label>
                                    <Select
                                        value={String(stars)}
                                        onValueChange={v => {
                                            setStars(Number(v));
                                            setDirty(true);
                                        }}
                                    >
                                        <SelectTrigger id="qualify-stars" className="rounded-sm text-sm">
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

                                <div className="flex-1 min-w-[12rem]">
                                    <p className="text-sm">
                                        <span className="font-mono tabular-nums text-lg font-semibold text-primary">
                                            {qualifiedCount}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {' '}of {evaluation.rows.length} players qualify
                                        </span>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Placement: upper final +15% · final 0% ·{' '}
                                        {stars === 5 ? '3rd −5%' : '3rd 0%'} · rest −10%
                                    </p>
                                    {!hasUpperBand && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            No upper-bracket finalist this season — single-elim
                                            playoffs, or the final is not seeded yet. Nobody
                                            receives +15%.
                                        </p>
                                    )}
                                    {selectedSpec && dirty && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Edited — differs from the saved {selectedSpec.name} spec.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {evaluation.unknownStatKeys.length > 0 && (
                                <p className="text-xs text-destructive">
                                    Unrecognised stat{evaluation.unknownStatKeys.length === 1 ? '' : 's'}:{' '}
                                    <span className="font-mono">{evaluation.unknownStatKeys.join(', ')}</span>.
                                    Nobody qualifies until these are fixed.
                                </p>
                            )}

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
                                    totalPlayers={players.length}
                                    onChange={updateRow}
                                    onRemove={removeRow}
                                    onAdd={addRow}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <Label>Secondary requirements</Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Only some must be cleared.
                                        </p>
                                    </div>
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
                                            className="rounded-sm w-16 font-mono tabular-nums text-sm"
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
                                    totalPlayers={players.length}
                                    onChange={updateRow}
                                    onRemove={removeRow}
                                    onAdd={addRow}
                                />
                            </div>
                        </div>

                        <div className="mt-6">
                            {playersLoading ? (
                                <div className="panel p-6 text-center">
                                    <p className="text-muted-foreground">Loading season stats…</p>
                                </div>
                            ) : (
                                <SpecQualificationTable rows={evaluation.rows} statKeys={statKeys} />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
