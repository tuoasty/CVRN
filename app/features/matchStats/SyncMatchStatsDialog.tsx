'use client';

import React, {useState, useEffect, useCallback} from 'react';
import {AlertCircle, CheckCircle2, RefreshCw} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import {Badge} from '@/app/components/ui/badge';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/app/components/ui/dialog';
import {previewMatchStats, syncMatchStats} from '@/app/hooks/useMatchSheetConfigs';
import {PlayoffMatchStatRow} from '@/server/domains/matchStats';
import type {MatchStatsPlan} from '@/server/domains/sheets/commands/buildMatchStatsPlan';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';

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

    const runPreview = useCallback(async (configId: string) => {
        setLoading(true);
        setPlan(null);
        setPreviewError(null);
        try {
            const result = await previewMatchStats(configId);
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
            runPreview(match.configId);
        } else {
            setPlan(null);
            setPreviewError(null);
            setLoading(false);
            setSaving(false);
        }
    }, [match?.configId, runPreview]);

    const handleSave = async () => {
        if (!match?.configId) return;
        setSaving(true);
        try {
            const result = await syncMatchStats(match.configId);
            if (!result.ok) {
                toast.error('Failed to sync', result.error.message);
                return;
            }
            toast.success('Stats synced', `${result.value.rows.length} row(s) written`);
            onOpenChange(false);
        } catch (err) {
            clientLogger.error('SyncMatchStatsDialog', 'Exception during sync', {err});
            toast.error('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const hasErrors = (plan?.errors.length ?? 0) > 0;
    const canSave = !!plan && !hasErrors && !loading && !saving;

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

                                {/* Errors */}
                                {hasErrors && (
                                    <div className="panel p-3 border border-destructive/40 bg-destructive/5 max-h-48 overflow-y-auto">
                                        <p className="text-xs uppercase tracking-wider text-destructive mb-2 font-medium">
                                            Errors ({plan.errors.length})
                                        </p>
                                        <ul className="space-y-1 text-xs">
                                            {plan.errors.map((e, i) => (
                                                <li key={i} className="text-foreground/80">
                                                    {e.row > 0 && <span className="font-mono text-muted-foreground">row {e.row}: </span>}
                                                    {e.message}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <Button
                                type="button"
                                disabled={!canSave}
                                onClick={handleSave}
                                className="rounded-sm"
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </Button>
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
                                    onClick={() => runPreview(match.configId!)}
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
