'use client';

import {useEffect, useRef, useState} from 'react';
import {cn} from '@/lib/utils';
import {parseThresholdInput} from './regionDraft';
import {comparator, formatThreshold} from './RequirementCells';

interface Props {
    statKey: string;
    value: number | null;
    dirty: boolean;
    label: string;
    autoFocus?: boolean;
    onCommit: (value: number | null) => void;
}

export default function ThresholdInput({statKey, value, dirty, label, autoFocus, onCommit}: Props) {
    const [text, setText] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const cancelled = useRef(false);

    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    const display = value === null ? 'unset' : formatThreshold(statKey, value);

    const commit = () => {
        const current = text;
        setText(null);
        if (cancelled.current) {
            cancelled.current = false;
            return;
        }
        if (current === null) return;
        const parsed = parseThresholdInput(current);
        if (parsed !== 'invalid' && parsed !== value) onCommit(parsed);
    };

    return (
        <span className="inline-flex items-baseline justify-end gap-1.5 font-mono tabular-nums">
            <span className="text-xs text-muted-foreground">{comparator(statKey)}</span>
            <input
                ref={inputRef}
                aria-label={label}
                inputMode="decimal"
                value={text ?? display}
                onFocus={e => {
                    setText(value === null ? '' : String(value));
                    requestAnimationFrame(() => e.target.select());
                }}
                onChange={e => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') {
                        cancelled.current = true;
                        e.currentTarget.blur();
                    }
                }}
                placeholder="unset"
                className={cn(
                    'w-20 bg-transparent text-right text-sm outline-none border-b border-transparent py-0.5',
                    'group-hover/row:border-muted-foreground focus:border-transparent',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4',
                    value === null && text === null && 'text-muted-foreground'
                )}
            />
            <span
                aria-hidden
                className={cn('size-1.5 self-center rounded-full', dirty ? 'bg-primary' : 'bg-transparent')}
            />
        </span>
    );
}

interface NeedProps {
    value: number;
    overflow: boolean;
    onCommit: (value: number) => void;
}

export function NeedInput({value, overflow, onCommit}: NeedProps) {
    const [text, setText] = useState<string | null>(null);
    const cancelled = useRef(false);

    const commit = () => {
        const current = text;
        setText(null);
        if (cancelled.current) {
            cancelled.current = false;
            return;
        }
        if (current === null || current.trim() === '') return;
        const parsed = Number(current.trim());
        if (Number.isInteger(parsed) && parsed >= 0 && parsed !== value) onCommit(parsed);
    };

    return (
        <input
            aria-label="Secondary requirements needed"
            inputMode="numeric"
            value={text ?? String(value)}
            onFocus={e => {
                setText(String(value));
                requestAnimationFrame(() => e.target.select());
            }}
            onChange={e => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                    cancelled.current = true;
                    e.currentTarget.blur();
                }
            }}
            className={cn(
                'w-6 bg-transparent text-center font-mono tabular-nums text-xs font-medium outline-none border-b',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
                overflow ? 'text-destructive border-destructive' : 'text-foreground border-muted-foreground'
            )}
        />
    );
}
