'use client';

import {cn} from '@/lib/utils';
import {SPEC_POSITIONS, SpecPosition, SpecWithRequirements} from '@/server/domains/spec/types';

interface Props {
    specs: SpecWithRequirements[];
    active: SpecPosition | 'ALL';
    onSelect: (p: SpecPosition | 'ALL') => void;
}

export default function PositionRail({specs, active, onSelect}: Props) {
    const countFor = (code: string) => specs.filter(s => s.position === code).length;

    return (
        <nav className="flex flex-col gap-0.5 p-1">
            <RailRow label="All" count={specs.length} on={active === 'ALL'} onClick={() => onSelect('ALL')} />
            {SPEC_POSITIONS.map(p => (
                <RailRow
                    key={p.code}
                    label={p.code}
                    title={p.label}
                    count={countFor(p.code)}
                    on={active === p.code}
                    onClick={() => onSelect(p.code)}
                />
            ))}
        </nav>
    );
}

function RailRow({label, title, count, on, onClick}: {label: string; title?: string; count: number; on: boolean; onClick: () => void}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                'flex items-center justify-between h-9 px-3 rounded-sm text-sm text-left transition-colors',
                on
                    ? 'bg-[var(--location-yellow,#facc15)] text-black font-semibold'
                    : 'text-foreground hover:bg-muted/40'
            )}
        >
            <span className="truncate">{label}</span>
            <span className="font-mono tabular-nums text-xs opacity-70">{count}</span>
        </button>
    );
}
