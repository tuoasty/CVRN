'use client';

import {Clock, Eye, History, Pencil, Play, Plus, RefreshCw, RotateCcw, Trash2} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import {SheetConfig} from '@/shared/types/db';

export type SyncConfigRow = {
    config: SheetConfig;
    regionCode: string;
    isSide: boolean;
    cronEnabled: boolean;
};

type Props = {
    title: string;
    emptyLabel: string;
    rows: SyncConfigRow[];
    lastSyncTimes: Record<string, string | null>;
    syncingId: string | null;
    togglingCronId: string | null;
    isSuperAdmin: boolean;
    onAdd: () => void;
    onSync: (cfg: SheetConfig) => void;
    onPreview: (cfg: SheetConfig) => void;
    onEdit: (cfg: SheetConfig) => void;
    onHistory: (cfg: SheetConfig) => void;
    onToggleCron: (cfg: SheetConfig) => void;
    onReset: (cfg: SheetConfig) => void;
    onDelete: (cfg: SheetConfig) => void;
};

export default function SyncConfigSection({
    title,
    emptyLabel,
    rows,
    lastSyncTimes,
    syncingId,
    togglingCronId,
    isSuperAdmin,
    onAdd,
    onSync,
    onPreview,
    onEdit,
    onHistory,
    onToggleCron,
    onReset,
    onDelete,
}: Props) {
    return (
        <section>
            <div className="flex items-baseline justify-between gap-4 pb-2 border-b border-border">
                <h2 className="text-sm font-semibold">
                    {title}
                    <span className="ml-2 font-mono text-xs tabular-nums text-muted-foreground">{rows.length}</span>
                </h2>
                <Button variant="ghost" size="sm" className="rounded-sm h-7 gap-1 text-xs" onClick={onAdd}>
                    <Plus className="h-3 w-3" />
                    Add
                </Button>
            </div>

            {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
            ) : (
                <div className="panel overflow-x-auto mt-2">
                    <table className="table-dense">
                        <thead>
                            <tr>
                                <th className="w-24">Region</th>
                                <th>Tab</th>
                                <th className="w-48">Last Synced</th>
                                <th className="w-16">Auto</th>
                                <th className="w-48">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({config: cfg, regionCode, isSide, cronEnabled}) => {
                                const lastSync = lastSyncTimes[cfg.id];
                                return (
                                    <tr key={cfg.id}>
                                        <td className="text-sm">
                                            <span className="font-mono font-semibold">{regionCode}</span>
                                            {isSide && <span className="ml-2 text-xs text-muted-foreground">Side</span>}
                                        </td>
                                        <td className="text-sm font-mono">{cfg.tab_name}</td>
                                        <td className="text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                                            {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
                                        </td>
                                        <td>
                                            <Button
                                                variant={cronEnabled ? 'default' : 'ghost'}
                                                size="sm"
                                                className={`rounded-sm gap-1 ${cronEnabled ? '' : 'text-muted-foreground'}`}
                                                onClick={() => onToggleCron(cfg)}
                                                disabled={togglingCronId !== null}
                                                title={cronEnabled ? 'Auto-sync on, click to disable' : 'Auto-sync off, click to enable'}
                                                aria-label={cronEnabled ? 'Disable auto-sync' : 'Enable auto-sync'}
                                                aria-pressed={cronEnabled}
                                            >
                                                {togglingCronId === cfg.id
                                                    ? <RefreshCw className="h-3 w-3 animate-spin" />
                                                    : <Clock className="h-3 w-3" />}
                                            </Button>
                                        </td>
                                        <td>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="rounded-sm gap-1"
                                                    onClick={() => onSync(cfg)}
                                                    disabled={syncingId !== null}
                                                >
                                                    {syncingId === cfg.id
                                                        ? <RefreshCw className="h-3 w-3 animate-spin" />
                                                        : <Play className="h-3 w-3" />}
                                                    Sync
                                                </Button>
                                                <Button variant="outline" size="sm" className="rounded-sm gap-1" onClick={() => onPreview(cfg)}>
                                                    <Eye className="h-3 w-3" />
                                                    Preview
                                                </Button>
                                                <Button variant="outline" size="sm" className="rounded-sm" onClick={() => onEdit(cfg)} aria-label="Edit config">
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="rounded-sm" onClick={() => onHistory(cfg)} title="View sync history" aria-label="View sync history">
                                                    <History className="h-3 w-3" />
                                                </Button>
                                                {isSuperAdmin && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="rounded-sm text-secondary hover:bg-secondary/10"
                                                            onClick={() => onReset(cfg)}
                                                            title="Reset config data"
                                                            aria-label="Reset config data"
                                                        >
                                                            <RotateCcw className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => onDelete(cfg)}
                                                            aria-label="Delete config"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
