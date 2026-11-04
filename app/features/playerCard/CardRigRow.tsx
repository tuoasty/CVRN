'use client'

import NumberField from '@/app/features/overall/NumberField'
import { rigImageHeight } from '@/server/domains/playerCard/helpers/rigPlacement'
import type { PlayerCardRig, RigPlacement } from '@/server/domains/playerCard'
import { cn } from '@/lib/utils'

const POSITION_RANGE = { step: 1, min: -5000, max: 5000 }
const SIZE_RANGE = { step: 1, min: 1, max: 5000 }
const LINK = 'text-xs text-primary hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40 disabled:no-underline'

export default function CardRigRow({
    username,
    rig,
    placement,
    dirty,
    saving,
    onChange,
    onSave,
    onDiscard,
}: {
    username: string
    rig: PlayerCardRig
    placement: RigPlacement
    dirty: boolean
    saving: boolean
    onChange: (placement: RigPlacement) => void
    onSave: () => void
    onDiscard: () => void
}) {
    const field = (key: keyof RigPlacement, label: string, range: typeof POSITION_RANGE) => (
        <td className="px-0.5">
            <NumberField value={placement[key]} range={range} label={label} onCommit={value => onChange({ ...placement, [key]: value })} />
        </td>
    )

    return (
        <tr className={cn('border-b border-border/60', dirty && 'shadow-[inset_2px_0_0_hsl(var(--primary))]')}>
            <td className="h-8 px-1.5 text-sm">
                <span className="text-foreground">Rig image</span>
                <span className="ml-2 text-xs text-muted-foreground">{username} only</span>
            </td>
            {field('imageX', 'Rig image X', POSITION_RANGE)}
            {field('imageY', 'Rig image Y', POSITION_RANGE)}
            {field('imageW', 'Rig image W', SIZE_RANGE)}
            <td className="px-1.5 text-right font-mono text-xs tabular-nums text-muted-foreground">{rigImageHeight(placement, rig)}</td>
            <td />
            <td className="whitespace-nowrap px-0.5 text-right">
                <span className="inline-flex gap-2 pr-1">
                    <button type="button" className={LINK} disabled={!dirty || saving} onClick={onSave}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" className={LINK} disabled={!dirty || saving} onClick={onDiscard}>
                        Discard
                    </button>
                </span>
            </td>
        </tr>
    )
}
