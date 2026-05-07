'use client';

import {useState, useEffect, useCallback} from 'react';
import {RefreshCw, Plus, Trash2, Eye, Sheet, Pencil} from 'lucide-react';
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
import {ParsedTeamResult} from '@/server/domains/sheets/types';
import {
    getSheetConfigsAction,
    saveSheetConfigAction,
    updateSheetConfigAction,
    deleteSheetConfigAction,
    previewSheetAction,
} from '@/app/actions/sheets.actions';

const SHEET_TYPES = ['teams', 'qualifier', 'playoff'] as const;

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
    blockStride: '5',
    isActive: true,
};

export default function AdminSyncPage() {
    const {seasons} = useSeasons();

    const [configs, setConfigs] = useState<SheetConfig[]>([]);
    const [configsLoading, setConfigsLoading] = useState(true);

    const [formOpen, setFormOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<SheetConfig | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<SheetConfig | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [previewConfig, setPreviewConfig] = useState<SheetConfig | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewResult, setPreviewResult] = useState<ParsedTeamResult[] | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const loadConfigs = useCallback(async () => {
        setConfigsLoading(true);
        const result = await getSheetConfigsAction();
        if (result.ok) setConfigs(result.value);
        setConfigsLoading(false);
    }, []);

    useEffect(() => { loadConfigs(); }, [loadConfigs]);

    const seasonName = (seasonId: string) => {
        const s = seasons.find(s => s.id === seasonId);
        return s?.name ?? seasonId.slice(0, 8);
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

    const handlePreview = async (config: SheetConfig) => {
        setPreviewConfig(config);
        setPreviewResult(null);
        setPreviewError(null);
        setPreviewLoading(true);
        try {
            const result = await previewSheetAction({
                sheetId: config.sheet_id,
                tabName: config.tab_name,
                headerRow: config.header_row,
                blockHeight: config.block_height,
                blockStride: config.block_stride,
            });
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
                {/* Header */}
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

                {/* Config table */}
                {configsLoading && (
                    <div className="panel p-6 mt-6">
                        <p className="text-muted-foreground">Loading...</p>
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
                                    <th>Header Row</th>
                                    <th>Block Height</th>
                                    <th>Stride</th>
                                    <th>Active</th>
                                    <th className="w-48">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {configs.map((cfg) => (
                                    <tr key={cfg.id}>
                                        <td className="text-sm">{seasonName(cfg.season_id)}</td>
                                        <td className="text-sm font-mono">{cfg.tab_name}</td>
                                        <td>
                                            <Badge variant="outline" className="rounded-sm text-xs font-mono">
                                                {cfg.sheet_type}
                                            </Badge>
                                        </td>
                                        <td className="text-sm">{cfg.header_row}</td>
                                        <td className="text-sm">{cfg.block_height}</td>
                                        <td className="text-sm">{cfg.block_stride}</td>
                                        <td>
                                            {cfg.is_active
                                                ? <Badge variant="default" className="rounded-sm text-xs">Active</Badge>
                                                : <Badge variant="secondary" className="rounded-sm text-xs">Inactive</Badge>
                                            }
                                        </td>
                                        <td>
                                            <div className="flex gap-1">
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
                                                    className="rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setDeleteTarget(cfg)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Config Dialog */}
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
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
                            <Select value={form.sheetType} onValueChange={(v) => setForm(f => ({...f, sheetType: v}))}>
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
                        {form.sheetType === 'teams' && (
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

            {/* Preview Dialog */}
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
                        {previewResult && previewResult.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">No teams detected. Check header row and tab name.</p>
                        )}
                        {previewResult && previewResult.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground mb-3">
                                    {previewResult.length} team{previewResult.length !== 1 ? 's' : ''} detected
                                </p>
                                <div className="panel overflow-hidden">
                                    <table className="table-dense">
                                        <thead>
                                            <tr>
                                                <th className="w-12">#</th>
                                                <th>Team Name</th>
                                                <th className="w-24">Players</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewResult.map((team) => (
                                                <tr key={team.teamNumber}>
                                                    <td className="text-sm font-mono text-muted-foreground">{team.teamNumber}</td>
                                                    <td className="text-sm font-medium">{team.teamName}</td>
                                                    <td className="text-sm text-muted-foreground">{team.players.length}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
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
