'use client';

import {useState} from 'react';
import {Button} from '@/app/components/ui/button';
import {useSpecHeightRanges} from '@/app/hooks/useSpecs';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';
import {HEIGHT_RANGE_STARS, HeightRangeByStar} from '@/server/domains/spec/types';

interface Props {
    regionId: string;
    regionCode: string;
    allRegionIds: string[];
}

type Target = 'region' | 'all';

export default function HeightRangeTray({regionId, regionCode, allRegionIds}: Props) {
    const code = regionCode.toUpperCase();
    const {byStar, isLoading, error, save} = useSpecHeightRanges(regionId);
    const [draft, setDraft] = useState<Record<number, string>>({});
    const [saving, setSaving] = useState<Target | null>(null);

    if (error) return <p className="py-3 text-sm text-destructive">{error}</p>;

    const valueOf = (star: number) => draft[star] ?? (byStar ? String(byStar[star]) : '');
    const parsed: HeightRangeByStar = {};
    let valid = !!byStar;
    for (const star of HEIGHT_RANGE_STARS) {
        const n = Number(valueOf(star));
        if (valueOf(star) === '' || !Number.isInteger(n) || n < 0 || n > 12) valid = false;
        else parsed[star] = n;
    }
    const dirty = !!byStar && HEIGHT_RANGE_STARS.some(star => parsed[star] !== byStar[star]);

    const submit = async (target: Target) => {
        setSaving(target);
        try {
            const regionIds = target === 'all' ? allRegionIds : [regionId];
            const result = await save(regionIds, parsed);
            if (!result.ok) {
                toast.error('Failed to save height ranges', result.error.message);
                return;
            }
            setDraft({});
            toast.success(target === 'all' ? 'Height ranges saved to every region' : `Height ranges saved to ${code}`);
        } catch (err) {
            clientLogger.error('HeightRangeTray', 'Failed to save height ranges', {error: err});
            toast.error('Something went wrong');
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Height range</span>
            {HEIGHT_RANGE_STARS.map(star => (
                <label key={star} className="flex items-center gap-1.5 font-mono text-sm tabular-nums">
                    <span className="text-muted-foreground">{star}★ ±</span>
                    <input
                        type="number"
                        min={0}
                        max={12}
                        step={1}
                        inputMode="numeric"
                        disabled={isLoading || saving !== null}
                        value={valueOf(star)}
                        onChange={e => setDraft(d => ({...d, [star]: e.target.value}))}
                        aria-label={`${star} star height range in inches`}
                        className="w-12 rounded-sm border border-border bg-background px-1.5 py-1 text-right outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
                    />
                    <span className="text-xs text-muted-foreground">in</span>
                </label>
            ))}
            <div className="flex-1" />
            <Button
                size="sm"
                variant="outline"
                className="rounded-sm"
                disabled={!valid || saving !== null || isLoading}
                onClick={() => void submit('all')}
            >
                {saving === 'all' ? 'Saving…' : 'Save to all regions'}
            </Button>
            <Button
                size="sm"
                className="rounded-sm"
                disabled={!valid || !dirty || saving !== null}
                onClick={() => void submit('region')}
            >
                {saving === 'region' ? 'Saving…' : `Save to ${code}`}
            </Button>
        </div>
    );
}
