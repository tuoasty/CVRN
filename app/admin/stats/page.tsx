'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {BarChart3, ExternalLink, Plus, RefreshCw, Trash2} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import {Badge} from '@/app/components/ui/badge';
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
import {useSeasonPlayoffMatches, deleteMatchSheetConfig, publishStats} from '@/app/hooks/useMatchSheetConfigs';
import {useTeamsBySeason} from '@/app/hooks/useTeams';
import {PlayoffMatchStatRow} from '@/server/domains/matchStats';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';
import AddMatchStatDialog from '@/app/features/matchStats/AddMatchStatDialog';
import SyncMatchStatsDialog from '@/app/features/matchStats/SyncMatchStatsDialog';

function StatusBadge({status}: {status: string}) {
    if (status === 'completed') return <Badge variant="default" className="rounded-sm text-xs">Completed</Badge>;
    if (status === 'scheduled') return <Badge variant="secondary" className="rounded-sm text-xs">Scheduled</Badge>;
    return <Badge variant="outline" className="rounded-sm text-xs">Pending</Badge>;
}

export default function AdminStatsPage() {
    const seasonId = useAdminContextStore(s => s.selectedSeasonId);
    const {matches, isLoading} = useSeasonPlayoffMatches(seasonId);
    const {teams} = useTeamsBySeason(seasonId);

    const [addTarget, setAddTarget] = useState<PlayoffMatchStatRow | null>(null);
    const [syncTarget, setSyncTarget] = useState<PlayoffMatchStatRow | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PlayoffMatchStatRow | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [publishing, setPublishing] = useState(false);

    const handlePublish = async () => {
        setPublishing(true);
        try {
            const result = await publishStats();
            if (!result.ok) {
                toast.error(result.error.message);
                return;
            }
            toast.success('Public leaderboards refreshed');
        } catch (err) {
            clientLogger.error('AdminStatsPage', 'Exception publishing stats', {err});
            toast.error('Something went wrong');
        } finally {
            setPublishing(false);
        }
    };

    const teamName = useMemo(() => {
        const map = new Map(teams.map(t => [t.id, t.name]));
        return (id: string | null) => (id ? (map.get(id) ?? 'TBD') : 'TBD');
    }, [teams]);

    const handleDelete = async () => {
        if (!deleteTarget?.configId) return;
        setDeleting(true);
        try {
            const result = await deleteMatchSheetConfig(deleteTarget.configId);
            if (!result.ok) {
                toast.error('Failed to remove', result.error.message);
                return;
            }
            toast.success('Stats sheet removed');
            setDeleteTarget(null);
        } catch (err) {
            clientLogger.error('AdminStatsPage', 'Exception deleting config', {err});
            toast.error('Something went wrong');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-section">
                {}
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <BarChart3 className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">
                            Match Stats
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Attach a stats sheet to a playoff match in the selected season
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="rounded-sm gap-2 shrink-0"
                        onClick={handlePublish}
                        disabled={publishing}
                    >
                        <RefreshCw className={publishing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                        Publish to site
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                    Syncing a sheet writes the stats but does not refresh the public
                    leaderboards. Press <span className="font-medium text-foreground">Publish to site</span> once
                    after finishing a batch of matches.
                </p>

                {!seasonId && (
                    <div className="panel p-6 mt-6 text-center">
                        <p className="text-muted-foreground">Select a season to view its playoff matches.</p>
                    </div>
                )}

                {seasonId && isLoading && (
                    <div className="panel overflow-x-auto mt-6">
                        <table className="table-dense">
                            <thead>
                                <tr>
                                    <th>Match</th>
                                    <th>Matchup</th>
                                    <th>Result</th>
                                    <th>Stats</th>
                                    <th className="w-40">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...Array(4)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(5)].map((_, j) => (
                                            <td key={j}><div className="h-4 bg-muted/40 rounded animate-pulse" /></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {seasonId && !isLoading && matches.length === 0 && (
                    <div className="panel p-6 mt-6 text-center">
                        <p className="text-muted-foreground">No playoff matches in this season yet.</p>
                    </div>
                )}

                {seasonId && !isLoading && matches.length > 0 && (
                    <div className="panel overflow-x-auto mt-6">
                        <table className="table-dense">
                            <thead>
                                <tr>
                                    <th>Match</th>
                                    <th>Matchup</th>
                                    <th>Result</th>
                                    <th>Stats</th>
                                    <th className="w-40">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matches.map(m => {
                                    const configured = !!m.configId;
                                    const isCompleted = m.status === 'completed';
                                    return (
                                        <tr key={m.matchId} className={configured ? 'bg-primary/5' : undefined}>
                                            <td className="text-sm font-mono">
                                                {m.synced ? (
                                                    <Link
                                                        href={`/admin/matches/${m.matchId}`}
                                                        className="inline-flex items-center gap-1 text-primary hover:underline"
                                                        title="View box score"
                                                    >
                                                        {m.matchCode ?? m.round ?? '—'}
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Link>
                                                ) : (
                                                    <span>{m.matchCode ?? m.round ?? '—'}</span>
                                                )}
                                            </td>
                                            <td className="text-sm font-medium">
                                                {teamName(m.homeTeamId)} <span className="text-muted-foreground font-normal">vs</span> {teamName(m.awayTeamId)}
                                            </td>
                                            <td><StatusBadge status={m.status} /></td>
                                            <td>
                                                {configured
                                                    ? (m.synced
                                                        ? <Badge variant="default" className="rounded-sm text-xs">Synced</Badge>
                                                        : <Badge variant="secondary" className="rounded-sm text-xs">Configured</Badge>)
                                                    : <span className="text-xs text-muted-foreground/60">Not configured</span>}
                                            </td>
                                            <td>
                                                {configured ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono text-muted-foreground truncate max-w-[140px]" title={m.sheetId ?? ''}>
                                                            {m.sheetId}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-sm gap-1"
                                                            onClick={() => setSyncTarget(m)}
                                                            title={m.synced ? 'Re-sync stats' : 'Sync stats'}
                                                        >
                                                            <RefreshCw className="h-3 w-3" />
                                                            {m.synced ? 'Re-sync' : 'Sync'}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => setDeleteTarget(m)}
                                                            title="Remove stats sheet"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : isCompleted ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-sm gap-1"
                                                        onClick={() => setAddTarget(m)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        Add Sheet
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground/50">Awaiting result</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AddMatchStatDialog
                match={addTarget}
                teamName={teamName}
                onOpenChange={(open) => { if (!open) setAddTarget(null); }}
            />

            <SyncMatchStatsDialog
                match={syncTarget}
                teamName={teamName}
                onOpenChange={(open) => { if (!open) setSyncTarget(null); }}
            />

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent className="rounded-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Stats Sheet</AlertDialogTitle>
                        <AlertDialogDescription>
                            Remove the stats sheet config for{' '}
                            <strong>{deleteTarget?.matchCode ?? deleteTarget?.round ?? 'this match'}</strong>?
                            {deleteTarget?.synced && ' Synced stats already saved will remain until re-synced or cleared.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm" disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? 'Removing...' : 'Remove'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
