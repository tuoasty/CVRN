'use client';

import {useState} from 'react';
import {TriangleAlert, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
    SpecPosition,
    SpecTier,
    LeagueSpecWithAllRegions,
    isLowerIsBetterStatKey,
    positionLabel,
    specStatLabel,
} from '@/server/domains/spec/types';
import {RegionSpecState, RegionState, groupByStars, referenceValue} from './catalogState';
import {SpecStateEdit, addRequirement, removeRequirement, setRequirementTier, setRequirementValue} from './regionDraft';
import {comparator, formatThreshold, ReferenceText} from './RequirementCells';
import {orderCheckFlags} from './statView';
import ThresholdInput from './ThresholdInput';
import {RegionColumn} from './BySpecView';

interface Props {
    statKey: string;
    pos: SpecPosition;
    regionCode: string;
    specs: LeagueSpecWithAllRegions[];
    columns: RegionColumn[];
    baseline: RegionState;
    stateOf: (specId: string) => RegionSpecState;
    onEdit: (specId: string, edit: SpecStateEdit) => void;
    onOpenSpec: (specId: string) => void;
}

const TIERS: {value: SpecTier; label: string}[] = [
    {value: 'main', label: 'Main'},
    {value: 'secondary', label: 'Sec'},
];

const TIER_SHORT: Record<SpecTier, string> = {main: 'Main', secondary: 'Sec'};

export default function ByStatView({statKey, pos, regionCode, specs, columns, baseline, stateOf, onEdit, onOpenSpec}: Props) {
    const [focusSpecId, setFocusSpecId] = useState<string | null>(null);

    const code = regionCode.toUpperCase();
    const label = specStatLabel(statKey);
    const lower = isLowerIsBetterStatKey(statKey);

    const reqOf = (specId: string) => stateOf(specId).requirements.find(r => r.statKey === statKey) ?? null;
    const baseOf = (specId: string) => baseline[specId]?.requirements.find(r => r.statKey === statKey) ?? null;

    const using = specs.filter(s => reqOf(s.id));
    const notUsing = groupByStars(specs.filter(s => !reqOf(s.id)));
    const bands = groupByStars(using);
    const flags = orderCheckFlags(
        using.map(s => ({specId: s.id, name: s.name, stars: s.stars, value: reqOf(s.id)?.minValue ?? null})),
        lower
    );
    const colSpan = 6 + columns.length;

    const add = (specId: string, tier: SpecTier) => {
        onEdit(specId, addRequirement(statKey, tier));
        setFocusSpecId(specId);
    };

    const row = (spec: LeagueSpecWithAllRegions) => {
        const req = reqOf(spec.id)!;
        const base = baseOf(spec.id);
        const changed = !base || base.tier !== req.tier || base.minValue !== req.minValue;
        const flag = flags[spec.id];
        return (
            <tr key={spec.id} className="group/row hover:bg-muted/20">
                <td className="h-10 px-3 border-b border-border/50 text-sm">
                    <button
                        type="button"
                        onClick={() => onOpenSpec(spec.id)}
                        className="text-left underline-offset-4 decoration-border hover:underline"
                    >
                        {spec.name}
                    </button>
                </td>
                <td className="h-10 px-3 border-b border-border/50">
                    <span className="inline-flex gap-2.5 text-xs font-semibold tracking-wider" role="group" aria-label={`${spec.name} tier`}>
                        {TIERS.map(t => (
                            <button
                                key={t.value}
                                type="button"
                                aria-pressed={req.tier === t.value}
                                onClick={() => req.tier !== t.value && onEdit(spec.id, setRequirementTier(statKey, t.value))}
                                className={cn(
                                    'py-0.5 border-b transition-colors',
                                    req.tier === t.value
                                        ? 'text-foreground border-foreground'
                                        : 'text-muted-foreground border-transparent hover:text-foreground'
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </span>
                </td>
                {columns.map(col => (
                    <td key={col.id} className="h-10 px-3 border-b border-border/50 text-right">
                        {col.current ? (
                            <ThresholdInput
                                statKey={statKey}
                                value={req.minValue}
                                dirty={!base || base.minValue !== req.minValue}
                                label={`${code} ${spec.name} ${label} threshold`}
                                autoFocus={focusSpecId === spec.id}
                                onCommit={v => onEdit(spec.id, setRequirementValue(statKey, v))}
                            />
                        ) : (
                            <ReferenceText statKey={statKey} value={referenceValue(col.state[spec.id], statKey)} />
                        )}
                    </td>
                ))}
                <td className="h-10 px-3 border-b border-border/50 text-right text-xs text-muted-foreground font-mono tabular-nums">
                    {changed &&
                        (!base ? (
                            <span className="font-sans">new</span>
                        ) : (
                            <>
                                {base.tier !== req.tier && <span className="font-sans mr-1.5">{TIER_SHORT[base.tier]}</span>}
                                {base.minValue === null ? <span className="font-sans">unset</span> : formatThreshold(statKey, base.minValue)}
                            </>
                        ))}
                </td>
                <td className="h-10 px-3 border-b border-border/50 text-xs text-muted-foreground">
                    {flag && (
                        <span className="inline-flex items-center gap-1.5">
                            <TriangleAlert className="size-3.5 shrink-0" />
                            {lower ? 'Lower' : 'Higher'} than a {flag.stars}★ ({flag.name}{' '}
                            <span className="font-mono tabular-nums">{formatThreshold(statKey, flag.value)}</span>)
                        </span>
                    )}
                </td>
                <td className="h-10 border-b border-border/50 text-center">
                    <button
                        type="button"
                        aria-label={`Remove ${label} from ${spec.name}`}
                        onClick={() => onEdit(spec.id, removeRequirement(statKey))}
                        className="p-1 text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:text-foreground"
                    >
                        <X className="size-3.5" />
                    </button>
                </td>
            </tr>
        );
    };

    return (
        <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-2 px-5 pt-4 pb-3">
                <h2 className="text-xl font-semibold tracking-tight">{label}</h2>
                <span className="text-sm text-muted-foreground">
                    · <span className="font-mono">{comparator(statKey)}</span> ·{' '}
                    <span className="font-mono tabular-nums">{using.length}</span> of{' '}
                    <span className="font-mono tabular-nums">{specs.length}</span> {positionLabel(pos)} specs
                </span>
            </div>
            <table className="w-full border-collapse">
                <colgroup>
                    <col className="w-[200px]" />
                    <col className="w-[110px]" />
                    {columns.map(col => (
                        <col key={col.id} className={cn('w-[120px]', col.current && 'bg-muted/50')} />
                    ))}
                    <col className="w-[110px]" />
                    <col />
                    <col className="w-10" />
                </colgroup>
                <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 text-left border-y border-border">Spec</th>
                        <th className="px-3 py-2 text-left border-y border-border">Tier</th>
                        {columns.map(col => (
                            <th
                                key={col.id}
                                className={cn('px-3 py-2 text-right border-y border-border', col.current && 'text-foreground')}
                            >
                                {col.code.toUpperCase()}
                            </th>
                        ))}
                        <th className="px-3 py-2 text-right border-y border-border">Before</th>
                        <th className="border-y border-border" />
                        <th className="border-y border-border" />
                    </tr>
                </thead>
                <tbody>
                    {bands.length === 0 && (
                        <tr>
                            <td colSpan={colSpan} className="h-10 px-3 border-b border-border/50 text-sm text-muted-foreground">
                                No {positionLabel(pos)} spec uses {label} in {code} yet.
                            </td>
                        </tr>
                    )}
                    {bands.map(band => [
                        <tr key={`band-${band.stars}`}>
                            <td colSpan={colSpan} className="px-3 pt-3.5 pb-1.5 border-b border-border">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {band.stars}★
                                </span>
                            </td>
                        </tr>,
                        ...band.items.map(row),
                    ])}
                </tbody>
            </table>
            {notUsing.length > 0 && (
                <div className="px-5 py-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Not using {label}
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-6">
                        {notUsing.flatMap(band =>
                            band.items.map(spec => (
                                <div key={spec.id} className="flex items-center gap-3 h-8 text-sm">
                                    <span className="flex-1 truncate">{spec.name}</span>
                                    <span className="text-xs text-muted-foreground font-mono tabular-nums">{spec.stars}★</span>
                                    <button
                                        type="button"
                                        onClick={() => add(spec.id, 'main')}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        + Main
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => add(spec.id, 'secondary')}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        + Sec
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
