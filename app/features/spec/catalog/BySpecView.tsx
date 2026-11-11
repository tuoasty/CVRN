'use client';

import {useState} from 'react';
import {ChevronDown, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Spec} from '@/shared/types/db';
import {formatHeight, specStatLabel, SpecPosition, SpecTier, LeagueSpecWithAllRegions} from '@/server/domains/spec/types';
import SpecStatCombobox from '@/app/features/spec/SpecStatCombobox';
import {DraftRequirement, RegionSpecState, RegionState, referenceValue} from './catalogState';
import {
    EMPTY_SPEC_STATE,
    SpecStateEdit,
    addRequirement,
    hasSecondaryOverflow,
    removeRequirement,
    replaceRequirementStat,
    secondaryCount,
    setRequirementTier,
    setRequirementValue,
    setSecondaryRequired,
} from './regionDraft';
import {ReferenceText} from './RequirementCells';
import ThresholdInput, {NeedInput} from './ThresholdInput';
import SpecIdentityForm from './SpecIdentityForm';
import {setSpecVaulted} from '@/app/hooks/useSpecs';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';

export interface RegionColumn {
    id: string;
    code: string;
    state: RegionState;
    current: boolean;
}

interface Props {
    spec: LeagueSpecWithAllRegions;
    regionCode: string;
    state: RegionSpecState;
    baseline: RegionSpecState | undefined;
    columns: RegionColumn[];
    onEdit: (edit: SpecStateEdit) => void;
    onDelete?: () => void;
    onDetailsSaved: (spec: Spec) => void;
}

const TIERS: {value: SpecTier; label: string}[] = [
    {value: 'main', label: 'Main'},
    {value: 'secondary', label: 'Sec'},
];

const linkClass =
    'text-xs text-muted-foreground underline decoration-border underline-offset-[3px] hover:text-foreground';

export default function BySpecView({spec, regionCode, state, baseline, columns, onEdit, onDelete, onDetailsSaved}: Props) {
    const [editingDetails, setEditingDetails] = useState(false);
    const [togglingVault, setTogglingVault] = useState(false);

    const toggleVault = async () => {
        const next = !spec.is_vaulted;
        setTogglingVault(true);
        try {
            const result = await setSpecVaulted(spec.id, next);
            if (!result.ok) {
                toast.error(next ? 'Failed to vault spec' : 'Failed to unvault spec', result.error.message);
                return;
            }
            toast.success(next ? `Vaulted ${spec.name}` : `Unvaulted ${spec.name}`);
        } catch (err) {
            clientLogger.error('BySpecView', 'Failed to toggle vault', {error: err});
            toast.error('Something went wrong');
        } finally {
            setTogglingVault(false);
        }
    };
    const [flashKey, setFlashKey] = useState<string | null>(null);
    const [focusKey, setFocusKey] = useState<string | null>(null);

    const code = regionCode.toUpperCase();
    const base = baseline ?? EMPTY_SPEC_STATE;
    const main = state.requirements.filter(r => r.tier === 'main');
    const secondary = state.requirements.filter(r => r.tier === 'secondary');
    const overflow = hasSecondaryOverflow(state);
    const takenKeys = new Set(state.requirements.map(r => r.statKey));
    const colSpan = 3 + columns.length;

    const isDirty = (r: DraftRequirement) => {
        const b = base.requirements.find(x => x.statKey === r.statKey);
        return !b || b.minValue !== r.minValue;
    };

    const moveTier = (statKey: string, tier: SpecTier) => {
        onEdit(setRequirementTier(statKey, tier));
        setFlashKey(statKey);
    };

    const row = (r: DraftRequirement) => {
        const label = specStatLabel(r.statKey);
        return (
            <tr
                key={r.statKey}
                className={cn('group/row hover:bg-muted/20', flashKey === r.statKey && 'row-flash')}
                onAnimationEnd={() => setFlashKey(null)}
            >
                <td className="h-10 px-3 border-b border-border/50 text-sm">
                    <SpecStatCombobox
                        value={r.statKey}
                        takenKeys={takenKeys}
                        onChange={key => {
                            onEdit(replaceRequirementStat(r.statKey, key));
                            setFocusKey(key);
                        }}
                        trigger={
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 text-left underline-offset-4 decoration-border group-hover/row:underline"
                            >
                                {label}
                                <ChevronDown className="size-3 text-muted-foreground opacity-0 group-hover/row:opacity-100" />
                            </button>
                        }
                    />
                </td>
                <td className="h-10 px-3 border-b border-border/50">
                    <span className="inline-flex gap-2.5 text-xs font-semibold tracking-wider" role="group" aria-label={`${label} tier`}>
                        {TIERS.map(t => (
                            <button
                                key={t.value}
                                type="button"
                                aria-pressed={r.tier === t.value}
                                onClick={() => r.tier !== t.value && moveTier(r.statKey, t.value)}
                                className={cn(
                                    'py-0.5 border-b transition-colors',
                                    r.tier === t.value
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
                                statKey={r.statKey}
                                value={r.minValue}
                                dirty={isDirty(r)}
                                label={`${code} ${label} threshold`}
                                autoFocus={focusKey === r.statKey}
                                onCommit={v => onEdit(setRequirementValue(r.statKey, v))}
                            />
                        ) : (
                            <ReferenceText statKey={r.statKey} value={referenceValue(col.state[spec.id], r.statKey)} />
                        )}
                    </td>
                ))}
                <td className="h-10 border-b border-border/50 text-center">
                    <button
                        type="button"
                        aria-label={`Remove ${label}`}
                        onClick={() => onEdit(removeRequirement(r.statKey))}
                        className="p-1 text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:text-foreground"
                    >
                        <X className="size-3.5" />
                    </button>
                </td>
            </tr>
        );
    };

    const addRow = (tier: SpecTier) => (
        <tr>
            <td colSpan={colSpan} className="h-9 px-3 border-b border-border/50">
                <SpecStatCombobox
                    value=""
                    takenKeys={takenKeys}
                    onChange={key => {
                        onEdit(addRequirement(key, tier));
                        setFocusKey(key);
                    }}
                    trigger={
                        <button type="button" className="text-sm text-muted-foreground hover:text-foreground">
                            + Add {tier === 'main' ? 'main' : 'secondary'} requirement
                        </button>
                    }
                />
            </td>
        </tr>
    );

    return (
        <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-3 px-5 pt-4 pb-3">
                <h2 className="text-xl font-semibold tracking-tight">{spec.name}</h2>
                <span className="text-sm text-muted-foreground font-mono tabular-nums">
                    {spec.stars}★ · {spec.position} · {formatHeight(spec.height)}
                </span>
                {spec.is_vaulted && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vaulted</span>
                )}
                <button
                    type="button"
                    className={linkClass}
                    onClick={toggleVault}
                    disabled={togglingVault}
                    aria-pressed={spec.is_vaulted}
                >
                    {togglingVault ? 'Saving…' : spec.is_vaulted ? 'Unvault' : 'Vault'}
                </button>
                {!editingDetails && (
                    <button type="button" className={linkClass} onClick={() => setEditingDetails(true)}>
                        Edit details
                    </button>
                )}
                <span className="flex-1" />
                {onDelete && (
                    <button type="button" className={linkClass} onClick={onDelete}>
                        Delete spec
                    </button>
                )}
            </div>
            {editingDetails && (
                <SpecIdentityForm
                    key={spec.id}
                    spec={spec}
                    defaultPosition={spec.position as SpecPosition}
                    onCancel={() => setEditingDetails(false)}
                    onSaved={saved => {
                        setEditingDetails(false);
                        onDetailsSaved(saved);
                    }}
                />
            )}
            <table className="w-full border-collapse">
                <colgroup>
                    <col />
                    <col className="w-[130px]" />
                    {columns.map(col => (
                        <col key={col.id} className={cn('w-[120px]', col.current && 'bg-muted/50')} />
                    ))}
                    <col className="w-10" />
                </colgroup>
                <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 text-left border-y border-border">Stat</th>
                        <th className="px-3 py-2 text-left border-y border-border">Tier</th>
                        {columns.map(col => (
                            <th
                                key={col.id}
                                className={cn('px-3 py-2 text-right border-y border-border', col.current && 'text-foreground')}
                            >
                                {col.code.toUpperCase()}
                            </th>
                        ))}
                        <th className="border-y border-border" />
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colSpan={colSpan} className="px-3 pt-3.5 pb-1.5 border-b border-border">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Main</span>
                            <span className="text-xs text-muted-foreground"> · all must clear</span>
                        </td>
                    </tr>
                    {main.map(row)}
                    {addRow('main')}
                    <tr>
                        <td colSpan={colSpan} className="px-3 pt-3.5 pb-1.5 border-b border-border">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secondary</span>
                            <span className={cn('text-xs', overflow ? 'text-foreground' : 'text-muted-foreground')}>
                                {' · need '}
                                <NeedInput
                                    value={state.secondaryRequired}
                                    overflow={overflow}
                                    onCommit={n => onEdit(setSecondaryRequired(n))}
                                />
                                {' of '}
                                <span className="font-mono tabular-nums">{secondaryCount(state)}</span>
                                {overflow && <span className="text-destructive"> · nobody could qualify</span>}
                            </span>
                        </td>
                    </tr>
                    {secondary.map(row)}
                    {addRow('secondary')}
                </tbody>
            </table>
        </div>
    );
}
