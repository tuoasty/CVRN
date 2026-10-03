'use client';

import {Star} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
    SpecWithRequirements,
    formatHeight,
    isLowerIsBetterStatKey,
    specStatLabel,
    specStatMeta,
    formatSpecStatValue,
} from '@/server/domains/spec/types';

interface Props {
    spec: SpecWithRequirements;
    selected: boolean;
    onClick: () => void;
}

function RequirementRows({reqs}: {reqs: SpecWithRequirements['requirements']}) {
    return (
        <>
            {reqs.map(r => {
                const format = specStatMeta(r.stat_key)?.format ?? 'count';
                return (
                    <div
                        key={r.id}
                        className="flex items-baseline justify-between gap-2 py-0.5 border-b border-border/40 last:border-0 text-xs"
                    >
                        <span className="truncate">{specStatLabel(r.stat_key)}</span>
                        <span className="font-mono tabular-nums font-medium shrink-0">
                            {r.min_value === null ? (
                                <span className="text-muted-foreground">unset</span>
                            ) : (
                                <>
                                    {isLowerIsBetterStatKey(r.stat_key) ? '≤' : '≥'}{' '}
                                    {formatSpecStatValue(Number(r.min_value), format)}
                                </>
                            )}
                        </span>
                    </div>
                );
            })}
        </>
    );
}

export default function SpecCard({spec, selected, onClick}: Props) {
    const main = spec.requirements.filter(r => r.tier === 'main');
    const secondary = spec.requirements.filter(r => r.tier === 'secondary');

    return (
        <button
            onClick={onClick}
            className={cn(
                'panel w-full max-h-[420px] flex flex-col overflow-hidden text-left cursor-pointer transition-colors',
                selected ? 'ring-1 ring-primary border-primary' : 'hover:border-primary/50'
            )}
        >
            <div className="p-2.5 border-b border-border shrink-0">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{spec.name}</span>
                    <span className="inline-flex items-center gap-0.5 shrink-0">
                        <span className="font-mono tabular-nums text-xs">{spec.stars}</span>
                        <Star className="h-3 w-3 fill-current text-primary" />
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono tabular-nums">{formatHeight(spec.height)}</span>
                    <span className="rounded-full border border-border px-1.5 py-px text-xs font-semibold">
                        {spec.position}
                    </span>
                </div>
            </div>
            <div className="p-2.5 overflow-y-auto space-y-2">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Main · all
                    </div>
                    {main.length > 0 ? (
                        <RequirementRows reqs={main} />
                    ) : (
                        <div className="text-xs text-muted-foreground/60">None</div>
                    )}
                </div>
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Secondary · need{' '}
                        <span className="font-mono text-primary">{spec.secondary_required}</span> of{' '}
                        {secondary.length}
                    </div>
                    {secondary.length > 0 ? (
                        <RequirementRows reqs={secondary} />
                    ) : (
                        <div className="text-xs text-muted-foreground/60">None</div>
                    )}
                </div>
            </div>
        </button>
    );
}
