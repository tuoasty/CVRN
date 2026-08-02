'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {Plus, Trash2} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import {Input} from '@/app/components/ui/input';
import {Label} from '@/app/components/ui/label';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/app/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/app/components/ui/select';
import {saveSpec} from '@/app/hooks/useSpecs';
import {
    isSpecStatKey,
    SPEC_STAT_KEYS,
    SpecTier,
    SpecWithRequirements,
} from '@/server/domains/spec/types';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';

interface Props {
    /** The spec being edited, or null for a new one. `open` drives visibility. */
    spec: SpecWithRequirements | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Not SpecRequirementInput: that type's statKey is narrowed to the stat-key union
// by the Zod refine, and a row being edited holds "" until a stat is picked.
// Converted to the strict shape on submit.
//
// rowId keeps React from reordering inputs when a row is removed — statKey would
// serve until two rows are both briefly unset.
type DraftRow = {
    rowId: string;
    tier: SpecTier;
    statKey: string;
    minValue: number;
};

const newRowId = () => Math.random().toString(36).slice(2);

const STAT_GROUPS = Array.from(new Set(SPEC_STAT_KEYS.map(s => s.group)));

function emptyDraft(tier: SpecTier): DraftRow {
    return {rowId: newRowId(), tier, statKey: '', minValue: 0};
}

export default function SpecFormDialog({spec, open, onOpenChange}: Props) {
    const [name, setName] = useState('');
    const [stars, setStars] = useState(5);
    const [secondaryRequired, setSecondaryRequired] = useState(3);
    const [rows, setRows] = useState<DraftRow[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName(spec?.name ?? '');
        setStars(spec?.stars ?? 5);
        setSecondaryRequired(spec?.secondary_required ?? 3);
        setRows(
            (spec?.requirements ?? []).map(r => ({
                rowId: newRowId(),
                tier: r.tier as SpecTier,
                statKey: r.stat_key,
                minValue: Number(r.min_value),
            }))
        );
        setSaving(false);
    }, [open, spec]);

    const mainRows = rows.filter(r => r.tier === 'main');
    const secondaryRows = rows.filter(r => r.tier === 'secondary');

    // Keys already taken, so the select can grey them out rather than letting the
    // save fail on the (spec_id, stat_key) unique.
    const takenKeys = useMemo(
        () => new Set(rows.map(r => r.statKey).filter(Boolean)),
        [rows]
    );

    const updateRow = (rowId: string, patch: Partial<DraftRow>) =>
        setRows(rs => rs.map(r => (r.rowId === rowId ? {...r, ...patch} : r)));

    const removeRow = (rowId: string) => setRows(rs => rs.filter(r => r.rowId !== rowId));

    const validationError = (() => {
        if (!name.trim()) return 'Name is required';
        if (rows.some(r => !r.statKey)) return 'Every requirement needs a stat';
        if (rows.some(r => !Number.isFinite(r.minValue))) return 'Every requirement needs a number';
        if (secondaryRequired > secondaryRows.length) {
            return `Requires ${secondaryRequired} of ${secondaryRows.length} secondary — nobody could qualify`;
        }
        return null;
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validationError) {
            toast.error(validationError);
            return;
        }
        // flatMap + a length check rather than a filter: a row whose stat key does not
        // resolve must fail the save loudly, not disappear from the spec silently.
        const requirements = rows.flatMap(r =>
            isSpecStatKey(r.statKey) ? [{tier: r.tier, statKey: r.statKey, minValue: r.minValue}] : []
        );
        if (requirements.length !== rows.length) {
            toast.error('Every requirement needs a stat');
            return;
        }

        setSaving(true);
        try {
            const result = await saveSpec({
                ...(spec ? {id: spec.id} : {}),
                name: name.trim(),
                stars,
                secondaryRequired,
                requirements,
            });
            if (!result.ok) {
                clientLogger.error('SpecFormDialog', 'Failed to save spec', {error: result.error});
                toast.error('Failed to save', result.error.message);
                return;
            }
            toast.success(spec ? 'Spec updated' : 'Spec created');
            onOpenChange(false);
        } catch (err) {
            clientLogger.error('SpecFormDialog', 'Exception saving spec', {err});
            toast.error('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const renderRows = (tier: SpecTier, list: DraftRow[]) => (
        <div className="space-y-2">
            {list.length === 0 && (
                <p className="text-xs text-muted-foreground/60 py-1">None yet.</p>
            )}
            {list.map(row => (
                <div key={row.rowId} className="flex items-center gap-2">
                    <Select
                        value={row.statKey}
                        onValueChange={v => updateRow(row.rowId, {statKey: v})}
                        disabled={saving}
                    >
                        <SelectTrigger className="rounded-sm flex-1 text-sm">
                            <SelectValue placeholder="Choose a stat" />
                        </SelectTrigger>
                        <SelectContent className="rounded-sm">
                            {STAT_GROUPS.map(group => (
                                <React.Fragment key={group}>
                                    <div className="px-2 py-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                                        {group}
                                    </div>
                                    {SPEC_STAT_KEYS.filter(s => s.group === group).map(s => (
                                        <SelectItem
                                            key={s.key}
                                            value={s.key as string}
                                            disabled={takenKeys.has(s.key as string) && row.statKey !== s.key}
                                            className="rounded-sm text-sm"
                                        >
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </React.Fragment>
                            ))}
                        </SelectContent>
                    </Select>

                    <span className="text-muted-foreground text-sm shrink-0">≥</span>

                    <Input
                        type="number"
                        step="any"
                        value={String(row.minValue)}
                        onChange={e => updateRow(row.rowId, {minValue: Number(e.target.value)})}
                        disabled={saving}
                        className="rounded-sm w-28 font-mono tabular-nums text-sm"
                    />

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => removeRow(row.rowId)}
                        disabled={saving}
                        aria-label="Remove requirement"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-sm gap-1"
                onClick={() => setRows(rs => [...rs, emptyDraft(tier)])}
                disabled={saving}
            >
                <Plus className="h-3 w-3" />
                Add {tier} requirement
            </Button>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[calc(100%-2rem)] !max-w-2xl rounded-sm max-h-[90vh] overflow-y-auto"
                aria-describedby={undefined}
            >
                <DialogHeader>
                    <DialogTitle>{spec ? 'Edit Spec' : 'New Spec'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                    <div className="flex gap-4">
                        <div className="space-y-2 flex-1">
                            <Label htmlFor="spec-name">Name</Label>
                            <Input
                                id="spec-name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                disabled={saving}
                                className="rounded-sm text-sm"
                                placeholder="Wilfredo Leon"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2 w-32">
                            <Label htmlFor="spec-stars">Stars</Label>
                            <Select
                                value={String(stars)}
                                onValueChange={v => setStars(Number(v))}
                                disabled={saving}
                            >
                                <SelectTrigger id="spec-stars" className="rounded-sm text-sm">
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
                    </div>

                    <div className="space-y-2">
                        <div>
                            <Label>Main requirements</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                                All must be cleared. The sets-played floor goes here.
                            </p>
                        </div>
                        {renderRows('main', mainRows)}
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
                                <Label htmlFor="spec-secondary-required" className="text-xs">
                                    Need
                                </Label>
                                <Input
                                    id="spec-secondary-required"
                                    type="number"
                                    min={0}
                                    max={secondaryRows.length}
                                    value={String(secondaryRequired)}
                                    onChange={e => setSecondaryRequired(Number(e.target.value))}
                                    disabled={saving}
                                    className="rounded-sm w-16 font-mono tabular-nums text-sm"
                                />
                                <span className="text-xs text-muted-foreground">
                                    of {secondaryRows.length}
                                </span>
                            </div>
                        </div>
                        {renderRows('secondary', secondaryRows)}
                    </div>

                    {validationError && (
                        <p className="text-xs text-destructive">{validationError}</p>
                    )}

                    <div className="flex gap-3 pt-1">
                        <Button
                            type="submit"
                            disabled={saving || !!validationError}
                            className="rounded-sm"
                        >
                            {saving ? 'Saving...' : spec ? 'Save' : 'Create'}
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
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
