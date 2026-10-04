import {formatSpecStatValue, isLowerIsBetterStatKey, specStatMeta} from '@/server/domains/spec/types';
import {ReferenceValue} from './catalogState';

export function formatThreshold(statKey: string, value: number): string {
    return formatSpecStatValue(value, specStatMeta(statKey)?.format ?? 'count');
}

export function comparator(statKey: string): string {
    return isLowerIsBetterStatKey(statKey) ? '≤' : '≥';
}

export function ThresholdText({statKey, value}: {statKey: string; value: number | null}) {
    return (
        <span className="inline-flex items-baseline justify-end gap-1.5 min-w-16 font-mono tabular-nums">
            <span className="text-xs text-muted-foreground">{comparator(statKey)}</span>
            {value === null ? (
                <span className="text-muted-foreground">unset</span>
            ) : (
                <span>{formatThreshold(statKey, value)}</span>
            )}
        </span>
    );
}

export function ReferenceText({statKey, value}: {statKey: string; value: ReferenceValue}) {
    if (value.kind === 'none') return <span className="text-xs text-muted-foreground">·</span>;
    if (value.kind === 'unset') return <span className="text-xs text-muted-foreground">unset</span>;
    return (
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {formatThreshold(statKey, value.value)}
        </span>
    );
}
