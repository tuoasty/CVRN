'use client';

import {ReactNode} from 'react';
import {cn} from '@/lib/utils';
import {SPEC_POSITIONS, SpecPosition} from '@/server/domains/spec/types';

interface Props {
    pos: SpecPosition;
    onPos: (pos: SpecPosition) => void;
    children: ReactNode;
}

export default function SpecCatalogList({pos, onPos, children}: Props) {
    return (
        <div className="border-r border-border min-w-0">
            <div className="flex gap-3.5 px-3 py-2.5 border-b border-border" role="tablist" aria-label="Position">
                {SPEC_POSITIONS.map(p => (
                    <button
                        key={p.code}
                        type="button"
                        role="tab"
                        title={p.label}
                        aria-selected={pos === p.code}
                        onClick={() => pos !== p.code && onPos(p.code)}
                        className={cn(
                            'text-xs font-semibold tracking-wider pb-0.5 border-b-2 transition-colors',
                            pos === p.code
                                ? 'text-foreground border-foreground'
                                : 'text-muted-foreground border-transparent hover:text-foreground'
                        )}
                    >
                        {p.code}
                    </button>
                ))}
            </div>
            <div className="pb-3">{children}</div>
        </div>
    );
}

export function ListBandLabel({children}: {children: ReactNode}) {
    return (
        <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {children}
        </div>
    );
}

interface ItemProps {
    active: boolean;
    quiet?: boolean;
    onClick: () => void;
    label: ReactNode;
    trailing: ReactNode;
}

export function ListItem({active, quiet, onClick, label, trailing}: ItemProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? 'true' : undefined}
            className={cn(
                'relative flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors',
                active ? 'bg-muted' : 'hover:bg-muted/30'
            )}
        >
            {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-foreground" />}
            <span className={cn('flex-1 truncate', quiet && 'text-muted-foreground')}>{label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{trailing}</span>
        </button>
    );
}
