'use client';

import {useEffect, useMemo, useState} from 'react';
import {Trash2} from 'lucide-react';
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
import SpecThresholdEditor, {DraftThreshold} from '@/app/features/spec/SpecThresholdEditor';
import {saveSpec, deleteSpec} from '@/app/hooks/useSpecs';
import {
    SPEC_POSITIONS,
    SpecPosition,
    SpecTier,
    SpecRequirementInput,
    SpecWithRequirements,
    formatHeight,
    parseHeightString,
} from '@/server/domains/spec/types';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';

const newRowId = () => Math.random().toString(36).slice(2);
const EMPTY_COUNTS = new Map<string, number>();

interface Props {
    spec: SpecWithRequirements | null;
    mode: 'edit' | 'create';
    onSaved: () => void;
    onDeleted: () => void;
}

export default function SpecEditPane({spec, mode, onSaved, onDeleted}: Props) {
    const [name, setName] = useState('');
    const [stars, setStars] = useState(5);
    const [position, setPosition] = useState<SpecPosition>('OH');
    const [heightStr, setHeightStr] = useState('6\'7"');
    const [secondaryRequired, setSecondaryRequired] = useState(3);
    const [rows, setRows] = useState<DraftThreshold[]>([]);
    const [saving, setSaving] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (mode === 'create' || !spec) {
            setName('');
            setStars(5);
            setPosition('OH');
            setHeightStr('6\'7"');
            setSecondaryRequired(3);
            setRows([]);
            return;
        }
        setName(spec.name);
        setStars(spec.stars);
        setPosition(spec.position as SpecPosition);
        setHeightStr(formatHeight(spec.height));
        setSecondaryRequired(spec.secondary_required);
        setRows(
            spec.requirements.map(r => ({
                rowId: newRowId(),
                tier: r.tier as SpecTier,
                statKey: r.stat_key,
                minValue: Number(r.min_value),
            }))
        );
    }, [spec, mode]);

    const mainRows = rows.filter(r => r.tier === 'main');
    const secondaryRows = rows.filter(r => r.tier === 'secondary');
    const parsedHeight = parseHeightString(heightStr);

    const takenKeys = useMemo(
        () => new Set(rows.map(r => r.statKey).filter(Boolean)),
        [rows]
    );

    const updateRow = (rowId: string, patch: Partial<DraftThreshold>) =>
        setRows(rs => rs.map(r => (r.rowId === rowId ? {...r, ...patch} : r)));
    const removeRow = (rowId: string) => setRows(rs => rs.filter(r => r.rowId !== rowId));
    const addRow = (tier: SpecTier) =>
        setRows(rs => [...rs, {rowId: newRowId(), tier, statKey: '', minValue: 0}]);

    const validationError = (() => {
        if (!name.trim()) return 'Name is required';
        if (parsedHeight === null) return 'Height must look like 6\'7"';
        if (rows.some(r => !r.statKey)) return 'Every requirement needs a stat';
        if (rows.some(r => !Number.isFinite(r.minValue))) return 'Every requirement needs a number';
        if (secondaryRequired > secondaryRows.length) {
            return `Requires ${secondaryRequired} of ${secondaryRows.length} secondary — nobody could qualify`;
        }
        return null;
    })();

    const handleSave = async () => {
        if (validationError || parsedHeight === null) {
            toast.error(validationError ?? 'Invalid height');
            return;
        }
        setSaving(true);
        try {
            const result = await saveSpec({
                ...(spec && mode === 'edit' ? {id: spec.id} : {}),
                name: name.trim(),
                stars,
                position,
                height: parsedHeight,
                secondaryRequired,
                requirements: rows
                    .filter(r => r.statKey)
                    .map(({tier, statKey, minValue}) => ({
                        tier,
                        statKey: statKey as SpecRequirementInput['statKey'],
                        minValue,
                    })),
            });
            if (!result.ok) {
                clientLogger.error('SpecEditPane', 'Failed to save spec', {error: result.error});
                toast.error('Failed to save', result.error.message);
                return;
            }
            toast.success(mode === 'edit' ? 'Spec updated' : 'Spec created');
            onSaved();
        } catch (err) {
            clientLogger.error('SpecEditPane', 'Exception saving spec', {err});
            toast.error('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!spec) return;
        setDeleting(true);
        try {
            const result = await deleteSpec(spec.id);
            if (!result.ok) {
                toast.error('Failed to delete', result.error.message);
                return;
            }
            toast.success('Spec deleted');
            setDeleteOpen(false);
            onDeleted();
        } catch (err) {
            clientLogger.error('SpecEditPane', 'Exception deleting spec', {err});
            toast.error('Something went wrong');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="p-4 space-y-5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {mode === 'edit' ? 'Editing spec' : 'New spec'}
                </span>
                {mode === 'edit' && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                        onClick={() => setDeleteOpen(true)}
                        disabled={saving}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                    </Button>
                )}
            </div>

            <div className="space-y-3">
                <div className="space-y-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                        id="edit-name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        disabled={saving}
                        className="rounded-sm text-sm w-full"
                        placeholder="Wilfredo Leon"
                    />
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="edit-position">Position</Label>
                        <Select
                            value={position}
                            onValueChange={v => setPosition(v as SpecPosition)}
                            disabled={saving}
                        >
                            <SelectTrigger id="edit-position" className="rounded-sm text-sm w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-sm">
                                {SPEC_POSITIONS.map(p => (
                                    <SelectItem
                                        key={p.code}
                                        value={p.code}
                                        className="rounded-sm text-sm"
                                        title={p.label}
                                    >
                                        {p.code}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-stars">Stars</Label>
                        <Select value={String(stars)} onValueChange={v => setStars(Number(v))} disabled={saving}>
                            <SelectTrigger id="edit-stars" className="rounded-sm text-sm w-full">
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
                        <Label htmlFor="edit-height">Height</Label>
                        <Input
                            id="edit-height"
                            value={heightStr}
                            onChange={e => setHeightStr(e.target.value)}
                            disabled={saving}
                            className="rounded-sm text-sm w-full font-mono tabular-nums"
                            placeholder="6'7&quot;"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div>
                    <Label>Main requirements</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                        All must be cleared. The sets-played floor goes here.
                    </p>
                </div>
                <SpecThresholdEditor
                    tier="main"
                    rows={mainRows}
                    takenKeys={takenKeys}
                    passCounts={EMPTY_COUNTS}
                    totalPlayers={0}
                    onChange={updateRow}
                    onRemove={removeRow}
                    onAdd={addRow}
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <Label>Secondary requirements</Label>
                        <p className="text-xs text-muted-foreground mt-1">Only some must be cleared.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Label htmlFor="edit-secondary-required" className="text-xs">
                            Need
                        </Label>
                        <Input
                            id="edit-secondary-required"
                            type="number"
                            min={0}
                            max={secondaryRows.length}
                            value={String(secondaryRequired)}
                            onChange={e => setSecondaryRequired(Number(e.target.value))}
                            disabled={saving}
                            className="rounded-sm w-16 font-mono tabular-nums text-sm"
                        />
                        <span className="text-xs text-muted-foreground">of {secondaryRows.length}</span>
                    </div>
                </div>
                <SpecThresholdEditor
                    tier="secondary"
                    rows={secondaryRows}
                    takenKeys={takenKeys}
                    passCounts={EMPTY_COUNTS}
                    totalPlayers={0}
                    onChange={updateRow}
                    onRemove={removeRow}
                    onAdd={addRow}
                />
            </div>

            {validationError && <p className="text-xs text-destructive">{validationError}</p>}

            <Button
                onClick={handleSave}
                disabled={saving || !!validationError}
                className="rounded-sm w-full"
            >
                {saving ? 'Saving…' : mode === 'edit' ? 'Save spec' : 'Create spec'}
            </Button>

            <AlertDialog open={deleteOpen} onOpenChange={o => { if (!o) setDeleteOpen(false); }}>
                <AlertDialogContent className="rounded-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Spec</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete <strong>{spec?.name}</strong> and its{' '}
                            {spec?.requirements.length ?? 0} requirement
                            {spec?.requirements.length === 1 ? '' : 's'}? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm" disabled={deleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting…' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
