'use client';

import {CSSProperties} from 'react';
import {Check} from 'lucide-react';
import {cn} from '@/lib/utils';
import AvatarImage from '@/app/components/ui/AvatarImage';
import {
    SpecQualificationRow,
    SpecStatFormat,
    formatSpecStatValue,
    isLowerIsBetterStatKey,
    specStatLabel,
    specStatMeta,
    specStatShort,
} from '@/server/domains/spec/types';
import {formatPlacementBonus} from '@/server/domains/spec/helpers/placementBonus';
import {formatPlacement} from '@/app/utils/placement';

interface Props {
    rows: SpecQualificationRow[];
    fallbackRows: SpecQualificationRow[];
    matchedLabel: string;
    fallbackLabel: string;
    statKeys: string[];
    thresholdByKey: Map<string, {minValue: number; format: string; lowerIsBetter: boolean}>;
    placeGroupSize: Map<number, number>;
}

const FROZEN: Record<'num' | 'player' | 'team', CSSProperties> = {
    num: {left: 0, width: 34, minWidth: 34},
    player: {left: 34, width: 150, minWidth: 150},
    team: {left: 184, width: 112, minWidth: 112},
};

const COL_SLOT: CSSProperties = {width: 62, minWidth: 62};
const COL_MS: CSSProperties = {width: 46, minWidth: 46};
const COL_STAT: CSSProperties = {minWidth: 58};

const HEAD = 'bg-muted text-muted-foreground';

export default function SpecQualificationTable({
    rows,
    fallbackRows,
    matchedLabel,
    fallbackLabel,
    statKeys,
    thresholdByKey,
    placeGroupSize,
}: Props) {
    if (rows.length === 0 && fallbackRows.length === 0) {
        return (
            <div className="p-6 text-center text-sm text-muted-foreground">
                No players with stats in this season.
            </div>
        );
    }

    const colCount = 6 + statKeys.length;
    const cellBg = (qualified: boolean, frozen: boolean) =>
        qualified ? 'bg-primary/5' : frozen ? 'bg-background' : '';

    const sectionRow = (label: string, key: string) => (
        <tr key={key}>
            <td colSpan={colCount} className="border-y border-border bg-muted/50 p-0">
                <div className="sticky left-0 inline-block px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                </div>
            </td>
        </tr>
    );

    const renderRow = (row: SpecQualificationRow, i: number, keyPrefix: string) => {
        const q = row.qualified;
        return (
            <tr key={`${keyPrefix}-${row.playerId}`}>
                <td
                    style={FROZEN.num}
                    className={cn('sticky left-0 z-10 px-1.5 py-1 text-right font-mono tabular-nums text-muted-foreground border-b border-border', cellBg(q, true))}
                >
                    {i + 1}
                </td>
                <td
                    style={FROZEN.player}
                    className={cn('sticky z-10 px-1.5 py-1 border-b border-border', cellBg(q, true))}
                >
                    <div className="flex items-center gap-2">
                        {q && <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-label="Qualifies" />}
                        <div className="relative w-6 h-6 rounded-sm overflow-hidden border border-border shrink-0">
                            <AvatarImage src={row.avatarUrl} alt={row.username} sizes="24px" />
                        </div>
                        <span className={cn('truncate', q ? 'font-semibold' : 'font-medium')}>
                            {row.displayName ?? row.username}
                        </span>
                    </div>
                </td>
                <td
                    style={FROZEN.team}
                    className={cn('sticky z-10 px-1.5 py-1 text-muted-foreground truncate border-b border-border', cellBg(q, true))}
                >
                    {row.teamName ?? '—'}
                </td>

                <td style={COL_SLOT} className={cn('px-1.5 py-1 text-center border-l border-b border-border whitespace-nowrap leading-tight', cellBg(q, false))}>
                    <div className={cn('flex items-center justify-center gap-1', row.place === null && 'text-muted-foreground')}>
                        <span>{row.place !== null ? formatPlacement(row.place, placeGroupSize.get(row.place) ?? 1) : '—'}</span>
                        {row.isUpperFinalist && (
                            <span
                                title="Upper-bracket finalist"
                                className="rounded-sm bg-primary/10 px-1 font-semibold text-primary"
                            >
                                UF
                            </span>
                        )}
                    </div>
                    <div
                        className={cn(
                            'font-mono tabular-nums',
                            row.placementBonus > 0 && 'text-primary',
                            row.placementBonus < 0 && 'text-destructive'
                        )}
                    >
                        {formatPlacementBonus(row.placementBonus)}
                    </div>
                </td>
                <td style={COL_MS} className={cn('px-1.5 py-1 text-center font-mono tabular-nums border-l border-b border-border', row.mainPassed < row.mainTotal && 'text-destructive', cellBg(q, false))}>
                    {row.mainPassed}/{row.mainTotal}
                </td>
                <td
                    style={COL_MS}
                    title={`Needs ${row.secondaryRequired}`}
                    className={cn('px-1.5 py-1 text-center font-mono tabular-nums border-b border-border', row.secondaryPassed < row.secondaryRequired && 'text-destructive', cellBg(q, false))}
                >
                    {row.secondaryPassed}/{row.secondaryTotal}
                </td>

                {statKeys.map((key, ci) => {
                    const check = row.checks.find(c => c.statKey === key);
                    const format = specStatMeta(key)?.format ?? 'count';
                    const shifted =
                        check !== undefined &&
                        check.value !== null &&
                        check.adjustedValue !== null &&
                        check.adjustedValue !== check.value;
                    return (
                        <td
                            key={key}
                            style={COL_STAT}
                            title={
                                check
                                    ? `${specStatLabel(key)} — ${isLowerIsBetterStatKey(key) ? 'at most' : 'needs'} ${formatSpecStatValue(check.minValue, format)} (${check.tier})`
                                    : undefined
                            }
                            className={cn(
                                'px-1.5 py-1 text-right font-mono tabular-nums leading-tight border-b border-border',
                                ci === 0 && 'border-l',
                                check ? (check.passed ? 'text-foreground' : 'text-destructive') : 'text-muted-foreground',
                                cellBg(q, false)
                            )}
                        >
                            <div className="font-medium">
                                {formatSpecStatValue(check?.adjustedValue ?? null, format)}
                            </div>
                            {shifted && (
                                <div className="text-muted-foreground/60 font-normal" title="Before placement bonus">
                                    {formatSpecStatValue(check.value, format)}
                                </div>
                            )}
                        </td>
                    );
                })}
            </tr>
        );
    };

    return (
        <table className="w-full border-separate border-spacing-0 text-xs">
            <thead>
                <tr>
                    <th
                        colSpan={3}
                        style={{left: 0}}
                        className={cn(HEAD, 'sticky top-0 z-30 h-6 px-2 text-left font-semibold uppercase tracking-wide')}
                    >
                        Player
                    </th>
                    <th className={cn(HEAD, 'sticky top-0 z-20 h-6 px-2 text-center font-semibold uppercase tracking-wide border-l border-border')}>
                        Placement
                    </th>
                    <th colSpan={2} className={cn(HEAD, 'sticky top-0 z-20 h-6 px-2 text-center font-semibold uppercase tracking-wide border-l border-border')}>
                        Qualification
                    </th>
                    {statKeys.length > 0 && (
                        <th colSpan={statKeys.length} className={cn(HEAD, 'sticky top-0 z-20 h-6 px-2 text-center font-semibold uppercase tracking-wide border-l border-border')}>
                            Stats — threshold
                        </th>
                    )}
                </tr>
                <tr>
                    <th style={FROZEN.num} className={cn(HEAD, 'sticky top-6 z-30 px-1.5 py-1 text-right font-semibold')}>#</th>
                    <th style={FROZEN.player} className={cn(HEAD, 'sticky top-6 z-30 px-1.5 py-1 text-left font-semibold')}>Player</th>
                    <th style={FROZEN.team} className={cn(HEAD, 'sticky top-6 z-30 px-1.5 py-1 text-left font-semibold')}>Team</th>
                    <th style={COL_SLOT} className={cn(HEAD, 'sticky top-6 z-20 px-1.5 py-1 text-center font-semibold border-l border-border')}>Place·Bon</th>
                    <th style={COL_MS} className={cn(HEAD, 'sticky top-6 z-20 px-1.5 py-1 text-center font-semibold border-l border-border')}>Main</th>
                    <th style={COL_MS} className={cn(HEAD, 'sticky top-6 z-20 px-1.5 py-1 text-center font-semibold')}>Sec</th>
                    {statKeys.map((key, i) => {
                        const t = thresholdByKey.get(key);
                        return (
                            <th
                                key={key}
                                title={specStatLabel(key)}
                                style={COL_STAT}
                                className={cn(HEAD, 'sticky top-6 z-20 px-1.5 py-1 text-right align-bottom whitespace-nowrap', i === 0 && 'border-l border-border')}
                            >
                                <div className="font-semibold">{specStatShort(key)}</div>
                                {t && (
                                    <div className="font-normal text-primary normal-case tracking-normal">
                                        {t.lowerIsBetter ? '≤' : '≥'} {formatSpecStatValue(t.minValue, t.format as SpecStatFormat)}
                                    </div>
                                )}
                            </th>
                        );
                    })}
                </tr>
            </thead>
            <tbody>
                {sectionRow(matchedLabel, 'matched-label')}
                {rows.length === 0 ? (
                    <tr key="matched-empty">
                        <td colSpan={colCount} className="border-b border-border px-2 py-3 text-center text-muted-foreground">
                            No players recorded at this position.
                        </td>
                    </tr>
                ) : (
                    rows.map((row, i) => renderRow(row, i, 'm'))
                )}
                {fallbackRows.length > 0 && sectionRow(fallbackLabel, 'fallback-label')}
                {fallbackRows.map((row, i) => renderRow(row, i, 'f'))}
            </tbody>
        </table>
    );
}
