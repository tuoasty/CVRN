'use client';

import React, {useState, useEffect, useCallback} from 'react';
import {AlertCircle, CheckCircle2, RefreshCw} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import {Badge} from '@/app/components/ui/badge';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/app/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import {previewMatchStats, syncMatchStats} from '@/app/hooks/useMatchSheetConfigs';
import {PlayoffMatchStatRow} from '@/server/domains/matchStats';
import type {MatchStatsPlan, PlayerOverrides} from '@/server/domains/sheets/commands/buildMatchStatsPlan';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';
import {editDistance} from '@/app/utils/editDistance';

// Sentinel for "leave this player unmapped" — Radix Select forbids an empty value.
const SKIP = '__skip__';

interface Props {
    match: PlayoffMatchStatRow | null;
    teamName: (id: string | null) => string;
    onOpenChange: (open: boolean) => void;
}

export default function SyncMatchStatsDialog({match, teamName, onOpenChange}: Props) {
    const [plan, setPlan] = useState<MatchStatsPlan | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    // sheet username (lowercased) → player_id. Ephemeral: a re-opened dialog
    // re-prompts, so a stale mapping can never silently misattribute later.
    const [overrides, setOverrides] = useState<PlayerOverrides>({});

    const runPreview = useCallback(async (configId: string, playerOverrides?: PlayerOverrides) => {
        setLoading(true);
        setPlan(null);
        setPreviewError(null);
        try {
            const result = await previewMatchStats(configId, playerOverrides);
            if (!result.ok) {
                setPreviewError(result.error.message);
                return;
            }
            setPlan(result.value);
        } catch (err) {
            clientLogger.error('SyncMatchStatsDialog', 'Exception during preview', {err});
            setPreviewError('Unexpected error during preview');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (match?.configId) {
            setOverrides({});
            runPreview(match.configId);
        } else {
            setPlan(null);
            setPreviewError(null);
            setLoading(false);
            setSaving(false);
            setOverrides({});
        }
    }, [match?.configId, runPreview]);

    const handleSave = async (force = false) => {
        if (!match?.configId) return;
        setSaving(true);
        try {
            const result = await syncMatchStats(match.configId, force, overrides);
            if (!result.ok) {
                toast.error('Failed to sync', result.error.message);
                return;
            }
            const {rows, skippedPlayers} = result.value;
            if (skippedPlayers.length > 0) {
                toast.success(
                    'Stats synced (partial)',
                    `${rows.length} row(s) written. Skipped ${skippedPlayers.join(', ')}.`
                );
            } else {
                toast.success('Stats synced', `${rows.length} row(s) written`);
            }
            onOpenChange(false);
        } catch (err) {
            clientLogger.error('SyncMatchStatsDialog', 'Exception during sync', {err});
            toast.error('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    // Absent `kind` means fatal — SyncError predates the field elsewhere.
    const fatalErrors = plan?.errors.filter(e => e.kind !== 'skippable') ?? [];
    const skippableErrors = plan?.errors.filter(e => e.kind === 'skippable') ?? [];
    const skipped = plan?.skippedPlayers ?? [];

    const hasErrors = (plan?.errors.length ?? 0) > 0;
    const canSave = !!plan && !hasErrors && !loading && !saving;
    // Force is a distinct action, never a mode on Save — it must not be reachable
    // by muscle memory, and it can never clear a fatal error.
    const canForce = !!plan && fatalErrors.length === 0 && skippableErrors.length > 0 && !loading && !saving;

    // Closest roster names first — a typo is usually one or two edits away.
    const candidatesFor = (sheetName: string) =>
        [...(plan?.rosterCandidates ?? [])].sort(
            (a, b) => editDistance(sheetName, a.username) - editDistance(sheetName, b.username)
        );

    return (
        <Dialog open={!!match} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] !max-w-2xl rounded-sm" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>Sync Match Stats</DialogTitle>
                </DialogHeader>

                {match && (
                    <div className="space-y-4 mt-2">
                        {/* Match header */}
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Match</p>
                            <p className="text-sm font-medium">
                                {(match.matchCode ?? match.round ?? 'Match')} — {teamName(match.homeTeamId)} vs {teamName(match.awayTeamId)}
                            </p>
                        </div>

                        {/* Loading */}
                        {loading && (
                            <div className="panel p-6 text-center">
                                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                                <p className="text-sm text-muted-foreground mt-2">Parsing sheet…</p>
                            </div>
                        )}

                        {/* Preview-level error (couldn't even run pipeline) */}
                        {!loading && previewError && (
                            <div className="panel p-4 border border-destructive/40 bg-destructive/5">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-destructive">Preview failed</p>
                                        <p className="text-xs text-muted-foreground mt-1">{previewError}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Plan summary */}
                        {!loading && plan && (
                            <>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="panel p-3">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Sets</p>
                                        <p className="text-2xl font-bold">{plan.summary.sets}</p>
                                    </div>
                                    <div className="panel p-3">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Rows to write</p>
                                        <p className="text-2xl font-bold">{plan.summary.rowCount}</p>
                                    </div>
                                    <div className="panel p-3">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                                        {hasErrors
                                            ? <Badge variant="destructive" className="rounded-sm text-xs mt-1">{plan.errors.length} error(s)</Badge>
                                            : <Badge variant="default" className="rounded-sm text-xs mt-1 gap-1"><CheckCircle2 className="h-3 w-3" />Clean</Badge>}
                                    </div>
                                </div>

                                {/* Teams */}
                                {plan.summary.teams.length > 0 && (
                                    <div className="panel p-3">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Teams detected</p>
                                        <ul className="space-y-1">
                                            {plan.summary.teams.map(t => (
                                                <li key={t.name} className="flex items-center justify-between text-sm">
                                                    <span className="font-medium">{t.name}</span>
                                                    <span className="text-muted-foreground">{t.playerCount} player(s)</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Sections whose sheet label differs from the team we matched them to.
                                    Attribution is silent otherwise; surface it so it can be checked. */}
                                {plan.summary.sections.some(s => s.headerLabel !== s.resolvedTeamName) && (
                                    <div className="panel p-3">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                                            Matched by roster
                                        </p>
                                        <ul className="space-y-1 text-xs">
                                            {plan.summary.sections
                                                .filter(s => s.headerLabel !== s.resolvedTeamName)
                                                .map(s => (
                                                    <li key={`${s.tabName}-${s.headerLabel}`} className="text-foreground/80">
                                                        <span className="font-mono text-muted-foreground">{s.tabName}: </span>
                                                        &ldquo;{s.headerLabel}&rdquo; → <span className="font-medium">{s.resolvedTeamName}</span>
                                                        <span className="text-muted-foreground"> ({s.votes}/{s.playerCount} players)</span>
                                                    </li>
                                                ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Blocking errors — the parse itself is wrong. Never bypassable. */}
                                {fatalErrors.length > 0 && (
                                    <div className="panel p-3 border border-destructive/40 bg-destructive/5 max-h-48 overflow-y-auto">
                                        <p className="text-xs uppercase tracking-wider text-destructive mb-2 font-medium">
                                            Blocking ({fatalErrors.length})
                                        </p>
                                        <ul className="space-y-1 text-xs">
                                            {fatalErrors.map((e, i) => (
                                                <li key={i} className="text-foreground/80">
                                                    {e.row > 0 && <span className="font-mono text-muted-foreground">row {e.row}: </span>}
                                                    {e.message}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Unresolved names. Map each to a real player, or leave it to be
                                    skipped. Candidates are restricted to the two rosters — anyone
                                    else would cast a bogus vote in section attribution. */}
                                {skipped.length > 0 && (
                                    <div className="panel p-3 border border-amber-500/40 bg-amber-500/5 max-h-60 overflow-y-auto">
                                        <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-1 font-medium">
                                            Unresolved ({skipped.length} player{skipped.length === 1 ? '' : 's'})
                                        </p>
                                        <p className="text-xs text-muted-foreground mb-3">
                                            Not found in our database. Map each to a roster player, or leave as
                                            Skip to drop their stats.
                                        </p>
                                        <ul className="space-y-2">
                                            {skipped.map(sheetName => (
                                                <li key={sheetName} className="flex items-center gap-2">
                                                    <span className="font-mono text-xs shrink-0 w-32 truncate" title={sheetName}>
                                                        {sheetName}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs">→</span>
                                                    <Select
                                                        value={overrides[sheetName.toLowerCase()] ?? SKIP}
                                                        onValueChange={v => setOverrides(prev => {
                                                            const next = {...prev};
                                                            if (v === SKIP) delete next[sheetName.toLowerCase()];
                                                            else next[sheetName.toLowerCase()] = v;
                                                            return next;
                                                        })}
                                                        disabled={saving}
                                                    >
                                                        <SelectTrigger className="h-8 rounded-sm text-xs flex-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value={SKIP}>Skip this player</SelectItem>
                                                            {candidatesFor(sheetName).map(c => (
                                                                <SelectItem key={c.playerId} value={c.playerId}>
                                                                    {c.username}
                                                                    <span className="text-muted-foreground"> · {c.teamName}</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </li>
                                            ))}
                                        </ul>
                                        {Object.keys(overrides).length > 0 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="rounded-sm mt-3 gap-1"
                                                disabled={saving || loading}
                                                onClick={() => match.configId && runPreview(match.configId, overrides)}
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                                Apply {Object.keys(overrides).length} mapping(s)
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <Button
                                type="button"
                                disabled={!canSave}
                                onClick={() => handleSave(false)}
                                className="rounded-sm"
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </Button>
                            {canForce && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleSave(true)}
                                    disabled={saving}
                                    className="rounded-sm border-amber-500/50 text-amber-600 hover:bg-amber-500/10 dark:text-amber-500"
                                >
                                    Sync anyway (skip {skipped.length} player{skipped.length === 1 ? '' : 's'})
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={saving}
                                className="rounded-sm"
                            >
                                Cancel
                            </Button>
                            {!loading && plan && match.configId && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => runPreview(match.configId!, overrides)}
                                    disabled={saving}
                                    className="rounded-sm ml-auto gap-1"
                                >
                                    <RefreshCw className="h-3 w-3" />
                                    Re-preview
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
