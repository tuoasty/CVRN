'use client';

import {Check, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import AvatarImage from '@/app/components/ui/AvatarImage';
import {
    SpecQualificationRow,
    formatSpecStatValue,
    specStatLabel,
    specStatMeta,
    specStatShort,
} from '@/server/domains/spec/types';
import {formatPlacementBonus} from '@/server/domains/spec/helpers/placementBonus';

interface Props {
    rows: SpecQualificationRow[];
    /** Column order, taken from the threshold editor so the table matches it. */
    statKeys: string[];
}

// Every cell is padded tighter than .table-dense's px-2 sm:px-4 default. With a
// dozen stat columns the default spacing pushes the table into horizontal scroll
// on its own, before any of the values are even wide.
const CELL = 'px-1.5';

export default function SpecQualificationTable({rows, statKeys}: Props) {
    if (rows.length === 0) {
        return (
            <div className="panel p-6 text-center">
                <p className="text-muted-foreground">No players with stats in this season.</p>
            </div>
        );
    }

    return (
        <div className="panel overflow-x-auto">
            <table className="table-dense">
                <thead>
                    <tr>
                        <th className={cn(CELL, 'w-8')}>#</th>
                        <th className={cn(CELL, 'w-44')}>Player</th>
                        <th className={cn(CELL, 'w-28')}>Team</th>
                        <th className={cn(CELL, 'w-8')} title="Podium placement">P</th>
                        <th className={cn(CELL, 'w-14 text-right')} title="Placement bonus">BON</th>
                        <th className={cn(CELL, 'w-8')} title="Qualifies">Q</th>
                        <th className={cn(CELL, 'w-12')} title="Main requirements cleared">MAIN</th>
                        <th className={cn(CELL, 'w-12')} title="Secondary requirements cleared">SEC</th>
                        {statKeys.map(key => (
                            <th
                                key={key}
                                className={cn(CELL, 'text-right whitespace-nowrap')}
                                title={specStatLabel(key)}
                            >
                                {specStatShort(key)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={row.playerId} className={cn(row.qualified && 'bg-primary/5')}>
                            <td className={cn(CELL, 'font-mono tabular-nums text-xs text-muted-foreground')}>
                                {i + 1}
                            </td>
                            <td className={CELL}>
                                <div className="flex items-center gap-2">
                                    <div className="relative w-8 h-8 rounded-sm overflow-hidden border border-border shrink-0">
                                        <AvatarImage src={row.avatarUrl} alt={row.username} sizes="32px" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate leading-tight">
                                            {row.displayName ?? row.username}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate leading-tight">
                                            {row.username}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className={cn(CELL, 'text-xs text-muted-foreground truncate')}>
                                {row.teamName ?? '—'}
                            </td>
                            <td className={cn(CELL, 'font-mono tabular-nums text-xs')}>
                                {row.placement ?? '—'}
                            </td>
                            <td
                                className={cn(
                                    CELL,
                                    'font-mono tabular-nums text-xs text-right',
                                    row.placementBonus > 0 && 'text-primary',
                                    row.placementBonus < 0 && 'text-destructive'
                                )}
                            >
                                {formatPlacementBonus(row.placementBonus)}
                            </td>
                            <td className={CELL}>
                                {row.qualified ? (
                                    <Check className="h-4 w-4 text-primary" aria-label="Qualifies" />
                                ) : (
                                    <X className="h-4 w-4 text-muted-foreground/50" aria-label="Out" />
                                )}
                            </td>
                            <td
                                className={cn(
                                    CELL,
                                    'font-mono tabular-nums text-xs',
                                    row.mainPassed < row.mainTotal && 'text-destructive'
                                )}
                            >
                                {row.mainPassed}/{row.mainTotal}
                            </td>
                            <td
                                className={cn(
                                    CELL,
                                    'font-mono tabular-nums text-xs',
                                    row.secondaryPassed < row.secondaryRequired && 'text-destructive'
                                )}
                                title={`Needs ${row.secondaryRequired}`}
                            >
                                {row.secondaryPassed}/{row.secondaryTotal}
                            </td>
                            {statKeys.map(key => {
                                const check = row.checks.find(c => c.statKey === key);
                                const format = specStatMeta(key)?.format ?? 'count';
                                // The raw value only earns a second line when the bonus moved
                                // it. Printing the same number twice is noise, and most cells
                                // in a zero-bonus row would do exactly that.
                                const shifted =
                                    check !== undefined &&
                                    check.value !== null &&
                                    check.adjustedValue !== null &&
                                    check.adjustedValue !== check.value;

                                return (
                                    <td
                                        key={key}
                                        className={cn(
                                            CELL,
                                            'font-mono tabular-nums text-xs text-right',
                                            check
                                                ? check.passed
                                                    ? 'text-foreground'
                                                    : 'text-destructive'
                                                : 'text-muted-foreground'
                                        )}
                                        title={
                                            check
                                                ? `${specStatLabel(key)} — needs ${formatSpecStatValue(check.minValue, format)} (${check.tier})`
                                                : undefined
                                        }
                                    >
                                        <div className="leading-tight font-medium">
                                            {formatSpecStatValue(check?.adjustedValue ?? null, format)}
                                        </div>
                                        {shifted && (
                                            <div
                                                className="text-muted-foreground/60 leading-tight font-normal"
                                                title="Before placement bonus"
                                            >
                                                {formatSpecStatValue(check.value, format)}
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
