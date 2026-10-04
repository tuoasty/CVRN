'use client';

import {useState} from 'react';
import {Button} from '@/app/components/ui/button';
import {Input} from '@/app/components/ui/input';
import {Label} from '@/app/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/app/components/ui/select';
import {saveSpecIdentity} from '@/app/hooks/useSpecs';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';
import {Spec} from '@/shared/types/db';
import {SPEC_POSITIONS, SpecPosition, formatHeight, parseHeightString} from '@/server/domains/spec/types';

const STARS = [5, 4, 3];

interface Props {
    spec: Spec | null;
    defaultPosition: SpecPosition;
    onSaved: (spec: Spec) => void;
    onCancel: () => void;
}

export default function SpecIdentityForm({spec, defaultPosition, onSaved, onCancel}: Props) {
    const [name, setName] = useState(spec?.name ?? '');
    const [position, setPosition] = useState<SpecPosition>((spec?.position as SpecPosition) ?? defaultPosition);
    const [stars, setStars] = useState(spec?.stars ?? 5);
    const [heightStr, setHeightStr] = useState(spec ? formatHeight(spec.height) : '6\'5"');
    const [saving, setSaving] = useState(false);

    const height = parseHeightString(heightStr);
    const error = !name.trim()
        ? 'Name is required'
        : height === null
          ? 'Height must look like 6\'7"'
          : height < 48 || height > 96
            ? 'Height must be between 4\'0" and 8\'0"'
            : null;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (error || height === null) return;
        setSaving(true);
        try {
            const result = await saveSpecIdentity({
                ...(spec ? {id: spec.id} : {}),
                name: name.trim(),
                position,
                stars,
                height,
            });
            if (!result.ok) {
                clientLogger.error('SpecIdentityForm', 'Failed to save spec', {error: result.error});
                toast.error(spec ? 'Failed to save details' : 'Failed to create spec', result.error.message);
                return;
            }
            toast.success(spec ? `Saved ${result.value.name}` : `Created ${result.value.name}`);
            onSaved(result.value);
        } catch (err) {
            clientLogger.error('SpecIdentityForm', 'Unexpected error saving spec', {error: err});
            toast.error('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="px-5 py-4 border-y border-border bg-muted/20">
            <div className="flex items-baseline gap-3 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {spec ? 'Details' : 'New spec'}
                </span>
                <span className="text-xs text-muted-foreground">
                    {spec ? 'Applies to all regions' : 'Requirements are added per region after it exists'}
                </span>
            </div>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 max-w-3xl">
                <div className="space-y-1.5">
                    <Label htmlFor="spec-name">Name</Label>
                    <Input id="spec-name" value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-1.5">
                    <Label>Position</Label>
                    <Select value={position} onValueChange={v => setPosition(v as SpecPosition)}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SPEC_POSITIONS.map(p => (
                                <SelectItem key={p.code} value={p.code}>
                                    {p.code} · {p.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label>Stars</Label>
                    <Select value={String(stars)} onValueChange={v => setStars(Number(v))}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STARS.map(s => (
                                <SelectItem key={s} value={String(s)}>
                                    {s}★
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="spec-height">Height</Label>
                    <Input
                        id="spec-height"
                        value={heightStr}
                        onChange={e => setHeightStr(e.target.value)}
                        className="font-mono tabular-nums"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
                <Button type="submit" size="sm" className="rounded-sm" disabled={saving || error !== null}>
                    {saving ? 'Saving…' : spec ? 'Save details' : 'Create spec'}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="rounded-sm" onClick={onCancel} disabled={saving}>
                    Cancel
                </Button>
                {error && <span className="text-xs text-muted-foreground">{error}</span>}
            </div>
        </form>
    );
}
