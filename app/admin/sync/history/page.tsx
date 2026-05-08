'use client';

import {useState, useEffect, useCallback, Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {RefreshCw} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import {Badge} from '@/app/components/ui/badge';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/app/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/app/components/ui/select';
import {SheetConfig, SheetSyncLog} from '@/shared/types/db';
import {SyncChange, SyncError} from '@/server/domains/sheets/types';
import {getSheetConfigsAction, getSyncLogsAction} from '@/app/actions/sheets.actions';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
    success: 'default',
    partial: 'secondary',
    failed: 'destructive',
};

const CHANGE_LABELS: Record<string, string> = {
    team_rename: 'Team',
    player_add: 'Added',
    player_remove: 'Removed',
    role_change: 'Role',
    match_result: 'Match',
};

function describeChange(c: SyncChange): string {
    switch (c.type) {
        case 'team_rename':
            if (!c.before.name) return `Created: ${c.after.name}`;
            if (c.after.disbanded) return `Disbanded: ${c.before.name}`;
            return `${c.before.name} → ${c.after.name}`;
        case 'player_add':
            return String(c.after.username ?? c.entityId);
        case 'player_remove':
            return String(c.before.username ?? c.entityId);
        case 'role_change':
            return `${c.before.role} → ${c.after.role}`;
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

function AdminSyncHistoryContent() {
    const searchParams = useSearchParams();
    const [configs, setConfigs] = useState<SheetConfig[]>([]);
    const [logs, setLogs] = useState<SheetSyncLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterConfigId, setFilterConfigId] = useState<string>(
        searchParams.get('config') ?? 'all'
    );
    const [selectedLog, setSelectedLog] = useState<SheetSyncLog | null>(null);

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

    const logChanges = selectedLog ? (selectedLog.changes as unknown as SyncChange[]) : [];
    const logErrors = selectedLog ? (selectedLog.errors as unknown as SyncError[]) : [];

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
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
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(5)].map((_, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    {[...Array(7)].map((_, j) => (
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
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => {
                                const cfg = configMap[log.sheet_config_id];
                                const changeCount = Array.isArray(log.changes) ? (log.changes as unknown[]).length : 0;
                                return (
                                    <tr
                                        key={log.id}
                                        className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
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
                                        <td className="px-4 py-2 text-muted-foreground">{log.triggered_by}</td>
                                        <td className="px-4 py-2 text-right">{log.rows_processed}</td>
                                        <td className="px-4 py-2 text-right">
                                            {log.rows_errored > 0
                                                ? <span className="text-destructive font-medium">{log.rows_errored}</span>
                                                : <span className="text-muted-foreground">0</span>}
                                        </td>
                                        <td className="px-4 py-2 text-right text-muted-foreground">{changeCount}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={!!selectedLog} onOpenChange={open => { if (!open) setSelectedLog(null); }}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Sync Log — {selectedLog && new Date(selectedLog.synced_at).toLocaleString()}
                        </DialogTitle>
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
        </div>
    );
}

export default function AdminSyncHistoryPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
            <AdminSyncHistoryContent />
        </Suspense>
    );
}
