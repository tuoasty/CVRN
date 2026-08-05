'use client';

import {useState, useEffect, useCallback} from 'react';
import {RefreshCw, Plus, Trash2, Eye, Sheet, Pencil, Play, History, RotateCcw, Clock, Copy, Check} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {Button} from '@/app/components/ui/button';
import {Badge} from '@/app/components/ui/badge';
import {Input} from '@/app/components/ui/input';
import {Label} from '@/app/components/ui/label';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/app/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/app/components/ui/select';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from '@/app/components/ui/alert-dialog';
import {useSeasons} from '@/app/hooks/useSeasons';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';
import {SheetConfig} from '@/shared/types/db';
import {ParsedTeamResult, ParsedMatchResult, SyncResult, SyncChange, SyncError} from '@/server/domains/sheets/types';

type PreviewResult =
    | { type: 'teams'; data: ParsedTeamResult[] }
    | { type: 'qualifier'; data: ParsedMatchResult[]; errors: { row: number; message: string }[]; totalRows: number; sampleCodes: string }
import {
    getSheetConfigsAction,
    saveSheetConfigAction,
    updateSheetConfigAction,
    deleteSheetConfigAction,
    previewSheetAction,
    runSyncAction,
    resetConfigAction,
    toggleCronEnabledAction,
    getLastSyncTimesAction,
} from '@/app/actions/sheets.actions';
import { useRegions } from '@/app/hooks';
import { useIsSuperAdmin } from '@/app/admin/AdminRoleProvider';

const SHEET_TYPES = ['teams', 'qualifier', 'playoff'] as const;

const CHANGE_LABELS: Record<string, string> = {
    team_creation: 'Created',
    team_rename: 'Renamed',
    team_disband: 'Disbanded',
    player_add: 'Added',
    player_remove: 'Removed',
    role_change: 'Role',
    match_result: 'Match',
};

function describeChange(c: SyncChange): string {
    switch (c.type) {
        case 'team_creation': return `Created: ${c.after.name}`;
        case 'team_rename': return `${c.before.name} → ${c.after.name}`;
        case 'team_disband': return `Disbanded: ${c.before.name}`;
        case 'player_add': return String(c.after.username ?? c.entityId);
        case 'player_remove': return String(c.before.username ?? c.entityId);
        case 'role_change': return `${c.before.role} → ${c.after.role}`;
        default: return JSON.stringify(c.after);
    }
}

type FormState = {
    seasonId: string;
    sheetId: string;
    tabName: string;
    sheetType: string;
    headerRow: string;
    blockHeight: string;
    blockStride: string;
    isActive: boolean;
};

const DEFAULT_FORM: FormState = {
    seasonId: '',
    sheetId: '',
    tabName: '',
    sheetType: 'teams',
    headerRow: '9',
    blockHeight: '18',
    blockStride: '4',
    isActive: true,
};

export default function AdminSyncPage() {
    const {seasons} = useSeasons();
    const {regions} = useRegions();
    const router = useRouter();
    const isSuperAdmin = useIsSuperAdmin();

    const [configs, setConfigs] = useState<SheetConfig[]>([]);
    const [configsLoading, setConfigsLoading] = useState(true);
    const [lastSyncTimes, setLastSyncTimes] = useState<Record<string, string | null>>({});

    const [formOpen, setFormOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<SheetConfig | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<SheetConfig | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [syncingId, setSyncingId] = useState<string | null>(null);

    const [resetTarget, setResetTarget] = useState<SheetConfig | null>(null);
    const [resetWipeData, setResetWipeData] = useState(true);
    const [resetClearLogs, setResetClearLogs] = useState(false);
    const [resetting, setResetting] = useState(false);

    const [togglingCronId, setTogglingCronId] = useState<string | null>(null);

    const [syncResultDialog, setSyncResultDialog] = useState<{config: SheetConfig; result: SyncResult} | null>(null);
    const [syncResultCopied, setSyncResultCopied] = useState(false);

    const [previewConfig, setPreviewConfig] = useState<SheetConfig | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const regionMap = Object.fromEntries(
        regions.map(r => [r.id, r])
    )

    const loadConfigs = useCallback(async () => {
        setConfigsLoading(true);
        const result = await getSheetConfigsAction();
        if (result.ok) {
            setConfigs(result.value);
            const timesResult = await getLastSyncTimesAction(result.value.map(c => c.id));
            if (timesResult.ok) setLastSyncTimes(timesResult.value);
        }
        setConfigsLoading(false);
    }, []);

    useEffect(() => { loadConfigs(); }, [loadConfigs]);

    const seasonName = (seasonId: string) => {
        const season = seasons.find(s => s.id === seasonId);
        console.log(season)

        if(!season) return seasonId.slice(0,8);
        const region = regionMap[season.region_id];

        return region ? `${season.name} (${region.code.toUpperCase()})` : season.name; 
    };

    const handleOpenAdd = () => {
        setEditingConfig(null);
        setForm(DEFAULT_FORM);
        setFormOpen(true);
    };

    const handleOpenEdit = (cfg: SheetConfig) => {
        setEditingConfig(cfg);
        setForm({
            seasonId: cfg.season_id,
            sheetId: cfg.sheet_id,
            tabName: cfg.tab_name,
            sheetType: cfg.sheet_type,
            headerRow: String(cfg.header_row),
            blockHeight: String(cfg.block_height),
            blockStride: String(cfg.block_stride),
            isActive: cfg.is_active,
        });
        setFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.sheetId || !form.tabName) {
            toast.error('Sheet ID and tab name are required');
            return;
        }
        if (!editingConfig && !form.seasonId) {
            toast.error('Season is required');
            return;
        }
        setSaving(true);
        try {
            const parsed = {
                ...form,
                headerRow: parseInt(form.headerRow, 10) || 9,
                blockHeight: parseInt(form.blockHeight, 10) || 18,
                blockStride: parseInt(form.blockStride, 10) || 5,
            };
            const result = editingConfig
                ? await updateSheetConfigAction({id: editingConfig.id, ...parsed})
                : await saveSheetConfigAction(parsed);
            if (!result.ok) {
                clientLogger.error('AdminSyncPage', 'Failed to save config', {error: result.error});
                toast.error('Failed to save config', result.error.message);
                return;
            }
            toast.success(editingConfig ? 'Config updated' : 'Config saved');
            setFormOpen(false);
            await loadConfigs();
        } catch (err) {
            clientLogger.error('AdminSyncPage', 'Exception saving config', {err});
            toast.error('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const result = await deleteSheetConfigAction(deleteTarget.id);
            if (!result.ok) {
                toast.error('Failed to delete', result.error.message);
                return;
            }
            toast.success('Config deleted');
            setDeleteTarget(null);
            await loadConfigs();
        } catch (err) {
            clientLogger.error('AdminSyncPage', 'Exception deleting config', {err});
            toast.error('Something went wrong');
        } finally {
            setDeleting(false);
        }
    };

    const handleSync = async (config: SheetConfig) => {
        setSyncingId(config.id);
        try {
            const result = await runSyncAction(config.id);
            if (!result.ok) {
                toast.error('Sync failed', result.error.message);
                return;
            }
            setSyncResultDialog({config, result: result.value});
            await loadConfigs();
        } catch (err) {
            clientLogger.error('AdminSyncPage', 'Exception running sync', {err});
            toast.error('Something went wrong');
        } finally {
            setSyncingId(null);
        }
    };

    const handleCopySyncResult = () => {
        if (!syncResultDialog) return;
        const {config, result} = syncResultDialog;
        const lines: string[] = [];
        lines.push(`Sync Summary — ${new Date().toLocaleString()}`);
        lines.push(`Config: ${config.tab_name} (${config.sheet_type})`);
        lines.push(`Status: ${result.rowsErrored > 0 ? 'errors' : 'success'} | ${result.rowsProcessed} rows processed${result.rowsErrored > 0 ? `, ${result.rowsErrored} errors` : ''}`);
        if (result.changes.length > 0) {
            lines.push('');
            lines.push(`Changes (${result.changes.length}):`);
            for (const c of result.changes) lines.push(`• ${CHANGE_LABELS[c.type] ?? c.type}: ${describeChange(c)}`);
        }
        if (result.errors.length > 0) {
            lines.push('');
            lines.push(`Errors (${result.errors.length}):`);
            for (const e of result.errors) lines.push(`• ${e.row ? `Row ${e.row}: ` : ''}${e.message}`);
        }
        navigator.clipboard.writeText(lines.join('\n'));
        setSyncResultCopied(true);
        setTimeout(() => setSyncResultCopied(false), 2000);
    };

    const handleToggleCron = async (cfg: SheetConfig) => {

        const current = (cfg as SheetConfig & {cron_enabled?: boolean}).cron_enabled as boolean;
        setTogglingCronId(cfg.id);
        try {
            const result = await toggleCronEnabledAction(cfg.id, !current);
            if (!result.ok) {
                toast.error('Failed to update auto-sync', result.error.message);
                return;
            }
            await loadConfigs();
        } catch (err) {
            clientLogger.error('AdminSyncPage', 'Exception toggling cron', {err});
            toast.error('Something went wrong');
        } finally {
            setTogglingCronId(null);
        }
    };

    const handleReset = async () => {
        if (!resetTarget) return;
        setResetting(true);
        try {
            const result = await resetConfigAction(resetTarget.id, {
                wipeData: resetWipeData,
                clearLogs: resetClearLogs,
            });
            if (!result.ok) {
                toast.error('Reset failed', result.error.message);
                return;
            }
            toast.success('Reset complete');
            setResetTarget(null);
            await loadConfigs();
        } catch (err) {
            clientLogger.error('AdminSyncPage', 'Exception resetting config', {err});
            toast.error('Something went wrong');
        } finally {
            setResetting(false);
        }
    };

    const handlePreview = async (config: SheetConfig) => {
        setPreviewConfig(config);
        setPreviewResult(null);
        setPreviewError(null);
        setPreviewLoading(true);
        try {
            const result = await previewSheetAction({
                sheetId: config.sheet_id,
                tabName: config.tab_name,
                sheetType: config.sheet_type,
                headerRow: config.header_row,
                blockHeight: config.block_height,
                blockStride: config.block_stride,
            });
            clientLogger.debug('AdminSyncPage', 'Preview Result', {PreviewResult:result})
            console.log(result)
            if (result.ok) {
                setPreviewResult(result.value);
            } else {
                setPreviewError(result.error.message);
            }
        } catch (err) {
            setPreviewError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setPreviewLoading(false);
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-section">
                {}
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <Sheet className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Sheet Sync
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage Google Sheets sync configs per season
                        </p>
                    </div>
                    <Button onClick={handleOpenAdd} className="rounded-sm gap-2">
                        <Plus className="h-4 w-4" />
                        Add Config
                    </Button>
                </div>

                {}
                {configsLoading && (
                    <div className="panel overflow-x-auto mt-6">
                        <table className="table-dense">
                            <thead>
                                <tr>
                                    <th>Season</th>
                                    <th>Tab</th>
                                    <th>Type</th>
                                    <th>Active</th>
                                    <th>Last Synced</th>
                                    <th>Auto</th>
                                    <th className="w-48">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(7)].map((_, j) => (
                                            <td key={j}><div className="h-4 bg-muted/40 rounded animate-pulse" /></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!configsLoading && configs.length === 0 && (
                    <div className="panel p-6 mt-6 text-center">
                        <p className="text-muted-foreground">No configs yet. Add one to get started.</p>
                    </div>
                )}

                {!configsLoading && configs.length > 0 && (
                    <div className="panel overflow-x-auto mt-6">
                        <table className="table-dense">
                            <thead>
                                <tr>
                                    <th>Season</th>
                                    <th>Tab</th>
                                    <th>Type</th>
                                    <th>Active</th>
                                    <th>Last Synced</th>
                                    <th>Auto</th>
                                    <th className="w-48">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {configs.map((cfg) => {

                                    const cronEnabled = (cfg as SheetConfig & {cron_enabled?: boolean}).cron_enabled ?? true;
                                    return (
                                    <tr key={cfg.id}>
                                        <td className="text-sm">{seasonName(cfg.season_id)}</td>
                                        <td className="text-sm font-mono">{cfg.tab_name}</td>
                                        <td>
                                            <Badge variant="outline" className="rounded-sm text-xs font-mono">
                                                {cfg.sheet_type}
                                            </Badge>
                                        </td>
                                        <td>
                                            {cfg.is_active
                                                ? <Badge variant="default" className="rounded-sm text-xs">Active</Badge>
                                                : <Badge variant="secondary" className="rounded-sm text-xs">Inactive</Badge>
                                            }
                                        </td>
                                        <td className="text-xs text-muted-foreground whitespace-nowrap">
                                            {lastSyncTimes[cfg.id]
                                                ? new Date(lastSyncTimes[cfg.id]!).toLocaleString()
                                                : <span className="text-muted-foreground/50">Never</span>}
                                        </td>
                                        <td>
                                            <Button
                                                variant={cronEnabled ? "default" : "ghost"}
                                                size="sm"
                                                className={`rounded-sm gap-1 ${cronEnabled ? '' : 'text-muted-foreground'}`}
                                                onClick={() => handleToggleCron(cfg)}
                                                disabled={togglingCronId !== null}
                                                title={cronEnabled ? 'Auto-sync on — click to disable' : 'Auto-sync off — click to enable'}
                                            >
                                                {togglingCronId === cfg.id
                                                    ? <RefreshCw className="h-3 w-3 animate-spin" />
                                                    : <Clock className="h-3 w-3" />
                                                }
                                            </Button>
                                        </td>
                                        <td>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="rounded-sm gap-1"
                                                    onClick={() => handleSync(cfg)}
                                                    disabled={syncingId !== null}
                                                >
                                                    {syncingId === cfg.id
                                                        ? <RefreshCw className="h-3 w-3 animate-spin" />
                                                        : <Play className="h-3 w-3" />
                                                    }
                                                    Sync
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-sm gap-1"
                                                    onClick={() => handlePreview(cfg)}
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    Preview
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-sm"
                                                    onClick={() => handleOpenEdit(cfg)}
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-sm"
                                                    onClick={() => router.push(`/admin/sync/history?config=${cfg.id}`)}
                                                    title="View sync history"
                                                >
                                                    <History className="h-3 w-3" />
                                                </Button>
                                                {isSuperAdmin && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="rounded-sm text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                                                            onClick={() => { setResetTarget(cfg); setResetWipeData(true); setResetClearLogs(false); }}
                                                            title="Reset config data"
                                                        >
                                                            <RotateCcw className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => setDeleteTarget(cfg)}
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
            </div>

            {}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="w-[calc(100%-2rem)] !max-w-lg rounded-sm" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{editingConfig ? 'Edit Sheet Config' : 'Add Sheet Config'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label>Season</Label>
                            <Select value={form.seasonId} onValueChange={(v) => setForm(f => ({...f, seasonId: v}))} disabled={!!editingConfig}>
                                <SelectTrigger className="rounded-sm">
                                    <SelectValue placeholder="Select season" />
                                </SelectTrigger>
                                <SelectContent>
                                    {seasons.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{seasonName(s.id)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {editingConfig && <p className="text-xs text-muted-foreground">Season cannot be changed after creation.</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sheet-id">Sheet ID</Label>
                            <Input
                                id="sheet-id"
                                value={form.sheetId}
                                onChange={e => setForm(f => ({...f, sheetId: e.target.value}))}
                                disabled={saving}
                                className="rounded-sm font-mono text-sm"
                                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                            />
                            <p className="text-xs text-muted-foreground">The ID from the Google Sheets URL.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tab-name">Tab Name</Label>
                            <Input
                                id="tab-name"
                                value={form.tabName}
                                onChange={e => setForm(f => ({...f, tabName: e.target.value}))}
                                disabled={saving}
                                className="rounded-sm"
                                placeholder="Teams AS"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Sheet Type</Label>
                            <Select
                                value={form.sheetType}
                                onValueChange={(v) => setForm(f => ({
                                    ...f,
                                    sheetType: v,
                                    headerRow: v === 'qualifier' ? '8' : v === 'teams' ? '9' : f.headerRow,
                                }))}
                            >
                                <SelectTrigger className="rounded-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SHEET_TYPES.map(t => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {(form.sheetType === 'teams' || form.sheetType === 'qualifier') && (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="header-row">Header Row</Label>
                                    <Input
                                        id="header-row"
                                        inputMode="numeric"
                                        value={form.headerRow}
                                        onChange={e => setForm(f => ({...f, headerRow: e.target.value}))}
                                        disabled={saving}
                                        className="rounded-sm"
                                    />
                                </div>
                                {form.sheetType === 'teams' && (<>
                                    <div className="space-y-2">
                                        <Label htmlFor="block-height">Block Height</Label>
                                        <Input
                                            id="block-height"
                                            inputMode="numeric"
                                            value={form.blockHeight}
                                            onChange={e => setForm(f => ({...f, blockHeight: e.target.value}))}
                                            disabled={saving}
                                            className="rounded-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="block-stride">Stride</Label>
                                        <Input
                                            id="block-stride"
                                            inputMode="numeric"
                                            value={form.blockStride}
                                            onChange={e => setForm(f => ({...f, blockStride: e.target.value}))}
                                            disabled={saving}
                                            className="rounded-sm"
                                        />
                                    </div>
                                </>)}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={form.isActive ? 'active' : 'inactive'} onValueChange={v => setForm(f => ({...f, isActive: v === 'active'}))} disabled={saving}>
                                <SelectTrigger className="rounded-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <Button type="submit" disabled={saving} className="rounded-sm">
                                {saving ? 'Saving...' : editingConfig ? 'Save Changes' : 'Save Config'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving} className="rounded-sm">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {}
            <Dialog open={!!previewConfig} onOpenChange={(open) => { if (!open) setPreviewConfig(null); }}>
                <DialogContent className="w-[calc(100%-2rem)] !max-w-2xl rounded-sm" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Preview — {previewConfig?.tab_name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-2">
                        {previewLoading && (
                            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Reading sheet...
                            </div>
                        )}
                        {previewError && (
                            <p className="text-sm text-destructive p-4 bg-destructive/10 rounded-sm">{previewError}</p>
                        )}
                        {previewResult && previewResult.data.length === 0 &&
                         !(previewResult.type === 'qualifier' && previewResult.errors.length > 0) && (
                            <div className="text-sm text-muted-foreground text-center py-8 space-y-1">
                                <p>{previewResult.type === 'qualifier' ? 'No matches detected.' : 'No teams detected.'} Check header row and tab name.</p>
                                {previewResult.type === 'qualifier' && (
                                    <p className="text-xs font-mono text-muted-foreground/70">
                                        {previewResult.totalRows} rows fetched · header_row={previewConfig?.header_row} · {previewResult.sampleCodes || 'no data at expected rows'}
                                    </p>
                                )}
                            </div>
                        )}
                        {previewResult && previewResult.type === 'teams' && previewResult.data.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground mb-3">
                                    {previewResult.data.length} team{previewResult.data.length !== 1 ? 's' : ''} detected
                                </p>
                                <div className="panel overflow-hidden">
                                    <table className="table-dense">
                                        <thead>
                                            <tr>
                                                <th className="w-12">#</th>
                                                <th>Team Name</th>
                                                <th className="w-20">Brick #</th>
                                                <th className="w-36">Color</th>
                                                <th className="w-20">Players</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewResult.data.map((team) => (
                                                <tr key={team.teamNumber}>
                                                    <td className="text-sm font-mono text-muted-foreground">{team.teamNumber}</td>
                                                    <td className="text-sm font-medium">{team.teamName}</td>
                                                    <td className="text-sm font-mono">
                                                        {team.brickNumber ?? <span className="text-muted-foreground">—</span>}
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-5 h-5 rounded-sm border border-border/50 shrink-0"
                                                                style={{backgroundColor: team.teamColor ?? '#9ca3af'}}
                                                            />
                                                            <span className="text-xs font-mono text-muted-foreground">
                                                                {team.teamColor ? team.teamColor.toUpperCase() : 'none'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="text-sm text-muted-foreground">{team.players.length}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {previewResult && previewResult.type === 'qualifier' && previewResult.data.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground mb-3">
                                    {previewResult.data.length} match{previewResult.data.length !== 1 ? 'es' : ''} detected
                                    {previewResult.errors.length > 0 && (
                                        <span className="text-destructive ml-2">· {previewResult.errors.length} parse error{previewResult.errors.length !== 1 ? 's' : ''}</span>
                                    )}
                                </p>
                                <div className="panel overflow-hidden">
                                    <table className="table-dense">
                                        <thead>
                                            <tr>
                                                <th className="w-16">Code</th>
                                                <th>Home</th>
                                                <th>Away</th>
                                                <th className="w-20">Sets</th>
                                                <th className="w-16">FF</th>
                                                <th>Schedule</th>
                                                <th>Referee</th>
                                                <th>Media</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewResult.data.map((match) => (
                                                <tr key={match.matchCode}>
                                                    <td className="text-sm font-mono text-muted-foreground">{match.matchCode}</td>
                                                    <td className="text-sm font-medium">{match.homeTeamName}</td>
                                                    <td className="text-sm font-medium">{match.awayTeamName}</td>
                                                    <td className="text-sm text-muted-foreground">
                                                        {match.sets.length > 0 ? match.sets.map(s => `${s.homeScore}-${s.awayScore}`).join(', ') : <span className="text-muted-foreground/50">—</span>}
                                                    </td>
                                                    <td className="text-sm">
                                                        {match.isForfeit ? <span className="text-destructive font-medium">FF</span> : <span className="text-muted-foreground/50">—</span>}
                                                    </td>
                                                    <td className="text-xs text-muted-foreground">
                                                        {match.scheduleRaw ?? <span className="text-muted-foreground/50">—</span>}
                                                    </td>
                                                    <td className="text-xs text-muted-foreground">
                                                        {match.referees.length > 0 ? match.referees.join(', ') : <span className="text-muted-foreground/50">—</span>}
                                                    </td>
                                                    <td className="text-xs text-muted-foreground">
                                                        {match.media.length > 0 ? match.media.join(', ') : <span className="text-muted-foreground/50">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {previewResult && previewResult.type === 'qualifier' && previewResult.errors.length > 0 && (
                            <div className="mt-2 space-y-1">
                                <p className="text-xs font-medium text-destructive">Parse errors:</p>
                                {previewResult.errors.map((e, i) => (
                                    <p key={i} className="text-xs text-destructive/80">Row {e.row}: {e.message}</p>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {}
            <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
                <DialogContent className="w-[calc(100%-2rem)] !max-w-md rounded-sm" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-500">
                            <RotateCcw className="h-4 w-4" />
                            Reset — {resetTarget?.tab_name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <p className="text-sm text-muted-foreground">
                            Choose what to reset for this config. This cannot be undone.
                        </p>
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={resetWipeData}
                                    onChange={e => setResetWipeData(e.target.checked)}
                                    disabled={resetting}
                                />
                                <div>
                                    <p className="text-sm font-medium">Wipe season data</p>
                                    <p className="text-xs text-muted-foreground">
                                        {resetTarget?.sheet_type === 'teams'
                                            ? 'Hard-deletes teams, rosters, and all matches (season + playoff) for this season.'
                                            : resetTarget?.sheet_type === 'qualifier'
                                            ? 'Hard-deletes all season matches and playoff matches for this season.'
                                            : 'Hard-deletes all playoff matches for this season.'}
                                        {' '}Next sync starts fresh.
                                    </p>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={resetClearLogs}
                                    onChange={e => setResetClearLogs(e.target.checked)}
                                    disabled={resetting}
                                />
                                <div>
                                    <p className="text-sm font-medium">Clear sync logs</p>
                                    <p className="text-xs text-muted-foreground">Permanently deletes all sync history for this config.</p>
                                </div>
                            </label>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <Button
                                variant="destructive"
                                className="rounded-sm"
                                disabled={resetting || (!resetWipeData && !resetClearLogs)}
                                onClick={handleReset}
                            >
                                {resetting ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : null}
                                {resetting ? 'Resetting...' : 'Confirm Reset'}
                            </Button>
                            <Button variant="outline" className="rounded-sm" onClick={() => setResetTarget(null)} disabled={resetting}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {}
            <Dialog open={!!syncResultDialog} onOpenChange={open => { if (!open) setSyncResultDialog(null); }}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-2">
                            <DialogTitle>
                                {syncResultDialog?.result.rowsErrored ? 'Sync completed with errors' : 'Sync complete'} — {syncResultDialog?.config.tab_name}
                            </DialogTitle>
                            <Button variant="outline" size="sm" onClick={handleCopySyncResult} className="shrink-0">
                                {syncResultCopied ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                                {syncResultCopied ? 'Copied' : 'Copy summary'}
                            </Button>
                        </div>
                    </DialogHeader>
                    {syncResultDialog && (() => {
                        const {result} = syncResultDialog;
                        const logChanges = result.changes as SyncChange[];
                        const logErrors = result.errors as SyncError[];
                        return (
                            <div className="space-y-5">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">{result.rowsProcessed} rows processed</span>
                                    {result.rowsErrored > 0 && <span className="text-destructive">{result.rowsErrored} errors</span>}
                                    {logChanges.length > 0 && <span className="text-muted-foreground">{logChanges.length} changes</span>}
                                </div>
                                {logErrors.length > 0 && (
                                    <div>
                                        <p className="text-sm font-semibold text-destructive mb-2">Errors ({logErrors.length})</p>
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
                                                            <td className="px-3 py-1.5 text-muted-foreground">{e.row || '—'}</td>
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
                                                                <Badge variant="outline" className="text-xs">{CHANGE_LABELS[c.type] ?? c.type}</Badge>
                                                            </td>
                                                            <td className="px-3 py-1.5 text-muted-foreground">{describeChange(c)}</td>
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
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent className="rounded-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Config</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete the config for tab <strong>{deleteTarget?.tab_name}</strong>? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm" disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
