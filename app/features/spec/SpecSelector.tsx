'use client';

import {useState} from 'react';
import {cn} from '@/lib/utils';
import {SPEC_POSITIONS, SpecWithRequirements, formatHeight} from '@/server/domains/spec/types';

interface Props {
    specs: SpecWithRequirements[];
    activeId: string | null;
    onPick: (spec: SpecWithRequirements) => void;
}

export default function SpecSelector({specs, activeId, onPick}: Props) {
    const activeSpec = specs.find(s => s.id === activeId) ?? null;
    const [expanded, setExpanded] = useState<string | null>(activeSpec?.position ?? null);

    const group = expanded ? specs.filter(s => s.position === expanded) : [];

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-5 gap-1">
                {SPEC_POSITIONS.map(p => {
                    const count = specs.filter(s => s.position === p.code).length;
                    const isExpanded = expanded === p.code;
                    const hasActive = activeSpec?.position === p.code;
                    return (
                        <button
                            key={p.code}
                            type="button"
                            onClick={() => setExpanded(isExpanded ? null : p.code)}
                            title={p.label}
                            aria-expanded={isExpanded}
                            className={cn(
                                'flex items-center justify-center gap-1 rounded-sm border px-1.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
                                isExpanded
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : hasActive
                                      ? 'border-secondary bg-secondary/15 text-foreground'
                                      : 'border-border text-foreground hover:border-primary/50'
                            )}
                        >
                            {p.code}
                            <span className="font-mono tabular-nums text-muted-foreground">{count}</span>
                        </button>
                    );
                })}
            </div>

            {expanded && (
                <div className="rounded-sm border border-border divide-y divide-border">
                    {group.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                            No specs for this position yet.
                        </p>
                    ) : (
                        group.map(s => {
                            const isActive = s.id === activeId;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => onPick(s)}
                                    aria-current={isActive}
                                    className={cn(
                                        'flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors',
                                        isActive ? 'bg-secondary/20' : 'hover:bg-muted/50'
                                    )}
                                >
                                    <span className="flex-1 truncate text-sm font-semibold">{s.name}</span>
                                    <span className="shrink-0 font-mono tabular-nums text-xs text-muted-foreground">
                                        {formatHeight(s.height)}
                                    </span>
                                    <span className="shrink-0 font-mono tabular-nums text-xs text-primary">
                                        {s.stars}★
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
