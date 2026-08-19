'use client';

import {useState, useEffect, useCallback} from 'react';
import {useSearchParams} from 'next/navigation';
import {RefreshCw, RotateCcw, Copy, Check} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import {Badge} from '@/app/components/ui/badge';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/app/components/ui/dialog';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from '@/app/components/ui/alert-dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/app/components/ui/select';
import {SheetConfig, SheetSyncLog} from '@/shared/types/db';
import {SyncChange, SyncError} from '@/server/domains/sheets/types';
import {getSheetConfigsAction, getSyncLogsAction, revertSyncsAction} from '@/app/actions/sheets.actions';
import {toast} from '@/app/utils/toast';

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'secondary' | 'destructive'> = {
    success: 'default',
    warning: 'warning',
    partial: 'secondary',
    failed: 'destructive',
};

const CHANGE_LABELS: Record<string, string> = {
    team_creation: 'Created',
    team_rename: 'Renamed',
    team_disband: 'Disbanded',
    player_add: 'Added',
    player_remove: 'Removed',
    role_change: 'Role',
    height_change: 'Height',
    match_result: 'Match',
};

function describeChange(c: SyncChange): string {
    switch (c.type) {
        case 'team_creation':
            return `Created: ${c.after.name}`;
        case 'team_rename':
            if (!c.before.name) return `Created: ${c.after.name}`;
            return `${c.before.name} → ${c.after.name}`;
        case 'team_disband':
            return `Disbanded: ${c.before.name}`;
        case 'player_add':
            return String(c.after.username ?? c.entityId);
        case 'player_remove':
            return String(c.before.username ?? c.entityId);
        case 'role_change':
            return `${c.before.role} → ${c.after.role}`;
        case 'height_change':
            return `${String(c.before.height ?? '—')} → ${String(c.after.height ?? '—')}`;
        case 'match_result': {
            const after = c.after as {matchCode?: string; status?: string; scheduledAt?: string | null; created?: boolean; homeSetsWon?: number; awaySetsWon?: number; isForfeit?: boolean};
            const code = after.matchCode ?? c.entityId.slice(0, 8);
            if (after.created) return `Created ${code} (${after.status ?? 'pending'})`;
            if (after.status === 'scheduled') {
                const when = after.scheduledAt ? new Date(after.scheduledAt).toLocaleString() : '—';
                return `${code} → scheduled ${when}`;
            }
            if (after.status === 'completed') {
                if (after.isForfeit) return `${code} → FF`;
                return `${code} → sets ${after.homeSetsWon}-${after.awaySetsWon}`;
            }
            return `${code} → ${after.status}`;
        }
        default:
            return JSON.stringify(c.after);
    }
}

interface SyncHistoryContentProps {
    canRevert: boolean;
}

export default function SyncHistoryContent({ canRevert }: SyncHistoryContentProps) {
    const searchParams = useSearchParams();
    const [configs, setConfigs] = useState<SheetConfig[]>([]);
    const [logs, setLogs] = useState<SheetSyncLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterConfigId, setFilterConfigId] = useState<string>(
        searchParams.get('config') ?? 'all'
    );
    const [selectedLog, setSelectedLog] = useState<SheetSyncLog | null>(null);
    const [revertTarget, setRevertTarget] = useState<SheetSyncLog | null>(null);
    const [reverting, setReverting] = useState(false);
    const [copied, setCopied] = useState(false);

    const configMap = Object.fromEntries(configs.map(c => [c.id, c]));

    const load = useCallback(async (configId: string) => {
        setLoading(true);
        const [cfgResult, logResult] = await Promise.all([
            getSheetConfigsAction(),
            getSyncLogsAction(configId === 'all' ? undefined : configId),
        ]);
        if (cfgResult.ok) setConfigs(cfgResult.value);
        if (logResult.ok) setLogs(logResult.value);
        setLoading(false);
    }, []);

    useEffect(() => { load(filterConfigId); }, [load, filterConfigId]);

    const handleRevert = async () => {
        if (!revertTarget) return;
        setReverting(true);
        try {
            const result = await revertSyncsAction(revertTarget.sheet_config_id, revertTarget.id);
            if (!result.ok) {
                toast.error('Revert failed', result.error.message);
                return;
            }
            toast.success(`Reverted ${result.value.syncsReverted} sync${result.value.syncsReverted !== 1 ? 's' : ''} — ${result.value.changesReverted} changes undone`);
            setRevertTarget(null);
            await load(filterConfigId);
        } catch {
            toast.error('Something went wrong');
        } finally {
            setReverting(false);
        }
    };

    const logChanges = selectedLog ? (selectedLog.changes as unknown as SyncChange[]) : [];
    const logErrors = selectedLog ? (selectedLog.errors as unknown as SyncError[]) : [];

    const handleCopySummary = () => {
        if (!selectedLog) return;
        const cfg = configMap[selectedLog.sheet_config_id];
        const lines: string[] = [];
        lines.push(`Sync Summary — ${new Date(selectedLog.synced_at).toLocaleString()}`);
        if (cfg) lines.push(`Config: ${cfg.tab_name} (${cfg.sheet_type})`);
        lines.push(`Status: ${selectedLog.status} | ${selectedLog.rows_processed} rows processed${selectedLog.rows_errored > 0 ? `, ${selectedLog.rows_errored} errors` : ''}`);
        if (logChanges.length > 0) {
            lines.push('');
            lines.push(`Changes (${logChanges.length}):`);
            for (const c of logChanges) lines.push(`• ${CHANGE_LABELS[c.type] ?? c.type}: ${describeChange(c)}`);
        }
        if (logErrors.length > 0) {
            lines.push('');
            lines.push(`Errors (${logErrors.length}):`);
            for (const e of logErrors) lines.push(`• ${e.row ? `Row ${e.row}: ` : ''}${e.message}`);
        }
        navigator.clipboard.writeText(lines.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="admin-container space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Sync History</h1>
                <div className="flex items-center gap-2">
                    <Select value={filterConfigId} onValueChange={setFilterConfigId}>
                        <SelectTrigger className="w-52">
                            <SelectValue placeholder="All configs" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All configs</SelectItem>
                            {configs.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.tab_name} ({c.sheet_type})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => load(filterConfigId)} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40">
                                <th className="text-left px-4 py-2 font-medium">Date</th>
                                <th className="text-left px-4 py-2 font-medium">Config</th>
                                <th className="text-left px-4 py-2 font-medium">Status</th>
                                <th className="text-left px-4 py-2 font-medium">Trigger</th>
                                <th className="text-right px-4 py-2 font-medium">Processed</th>
                                <th className="text-right px-4 py-2 font-medium">Errors</th>
                                <th className="text-right px-4 py-2 font-medium">Changes</th>
                                {canRevert && <th className="text-right px-4 py-2 font-medium">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(5)].map((_, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    {[...Array(canRevert ? 8 : 7)].map((_, j) => (
                                        <td key={j} className="px-4 py-2">
                                            <div className="h-4 bg-muted/40 rounded animate-pulse" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sync history found.</p>
            ) : (
                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40">
                                <th className="text-left px-4 py-2 font-medium">Date</th>
                                <th className="text-left px-4 py-2 font-medium">Config</th>
                                <th className="text-left px-4 py-2 font-medium">Status</th>
                                <th className="text-left px-4 py-2 font-medium">Trigger</th>
                                <th className="text-right px-4 py-2 font-medium">Processed</th>
                                <th className="text-right px-4 py-2 font-medium">Errors</th>
                                <th className="text-right px-4 py-2 font-medium">Changes</th>
                                {canRevert && <th className="text-right px-4 py-2 font-medium">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => {
                                const cfg = configMap[log.sheet_config_id];
                                const changeCount = Array.isArray(log.changes) ? (log.changes as unknown[]).length : 0;
                                return (
                                    <tr
                                        key={log.id}
                                        className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer ${log.triggered_by === 'rollback' ? 'opacity-60' : ''}`}
                                        onClick={() => setSelectedLog(log)}
                                    >
                                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                                            {new Date(log.synced_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2">
                                            {cfg ? (
                                                <>
                                                    {cfg.tab_name}{' '}
                                                    <span className="text-muted-foreground">({cfg.sheet_type})</span>
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground">{log.sheet_config_id.slice(0, 8)}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            <Badge variant={STATUS_VARIANT[log.status] ?? 'secondary'}>
                                                {log.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-2 text-muted-foreground">
                                            {log.triggered_by === 'rollback' ? (
                                                <Badge variant="secondary" className="text-xs">Rollback</Badge>
                                            ) : log.triggered_by}
                                        </td>
                                        <td className="px-4 py-2 text-right">{log.rows_processed}</td>
                                        <td className="px-4 py-2 text-right">
                                            {log.rows_errored > 0
                                                ? <span className="text-destructive font-medium">{log.rows_errored}</span>
                                                : <span className="text-muted-foreground">0</span>}
                                        </td>
                                        <td className="px-4 py-2 text-right text-muted-foreground">{changeCount}</td>
                                        {canRevert && (
                                            <td className="px-4 py-2 text-right" onClick={e => e.stopPropagation()}>
                                                {log.triggered_by !== 'rollback' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                                                        onClick={() => setRevertTarget(log)}
                                                    >
                                                        <RotateCcw className="w-3 h-3 mr-1" />
                                                        Revert to here
                                                    </Button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={!!selectedLog} onOpenChange={open => { if (!open) setSelectedLog(null); }}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-2">
                            <DialogTitle>
                                Sync Log — {selectedLog && new Date(selectedLog.synced_at).toLocaleString()}
                            </DialogTitle>
                            <Button variant="outline" size="sm" onClick={handleCopySummary} className="shrink-0">
                                {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                                {copied ? 'Copied' : 'Copy summary'}
                            </Button>
                        </div>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-5">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={STATUS_VARIANT[selectedLog.status] ?? 'secondary'}>
                                    {selectedLog.status}
                                </Badge>
                                <Badge variant="outline">{selectedLog.triggered_by}</Badge>
                                <span className="text-sm text-muted-foreground">
                                    {selectedLog.rows_processed} rows processed
                                </span>
                                {selectedLog.rows_errored > 0 && (
                                    <span className="text-sm text-destructive">
                                        {selectedLog.rows_errored} errors
                                    </span>
                                )}
                            </div>

                            {logErrors.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold text-destructive mb-2">
                                        Errors ({logErrors.length})
                                    </p>
                                    <div className="rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-muted/40">
                                                    <th className="text-left px-3 py-1.5 font-medium w-16">Row</th>
                                                    <th className="text-left px-3 py-1.5 font-medium">Message</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {logErrors.map((e, i) => (
                                                    <tr key={i} className="border-b last:border-0">
                                                        <td className="px-3 py-1.5 text-muted-foreground">
                                                            {e.row || '—'}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-destructive">{e.message}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {logChanges.length > 0 ? (
                                <div>
                                    <p className="text-sm font-semibold mb-2">Changes ({logChanges.length})</p>
                                    <div className="rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-muted/40">
                                                    <th className="text-left px-3 py-1.5 font-medium w-28">Type</th>
                                                    <th className="text-left px-3 py-1.5 font-medium">Detail</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {logChanges.map((c, i) => (
                                                    <tr key={i} className="border-b last:border-0">
                                                        <td className="px-3 py-1.5">
                                                            <Badge variant="outline" className="text-xs">
                                                                {CHANGE_LABELS[c.type] ?? c.type}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-3 py-1.5 text-muted-foreground">
                                                            {describeChange(c)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No changes recorded.</p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {canRevert && (
                <AlertDialog open={!!revertTarget} onOpenChange={open => { if (!open) setRevertTarget(null); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Revert to this sync?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {revertTarget && (() => {
                                    const affected = logs.filter(
                                        l => l.triggered_by !== 'rollback' && l.synced_at >= revertTarget.synced_at
                                    );
                                    const totalChanges = affected.reduce(
                                        (sum, l) => sum + (Array.isArray(l.changes) ? (l.changes as unknown[]).length : 0),
                                        0
                                    );
                                    return `This will revert ${affected.length} sync${affected.length !== 1 ? 's' : ''} and undo ${totalChanges} change${totalChanges !== 1 ? 's' : ''}. This cannot be undone — re-sync from the sheet to restore data.`;
                                })()}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={reverting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleRevert}
                                disabled={reverting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {reverting ? 'Reverting...' : 'Revert'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
