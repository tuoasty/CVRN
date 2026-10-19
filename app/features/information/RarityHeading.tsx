import { cn } from '@/lib/utils'
import { rarityTextClass } from './rarity'

interface Props {
    rarity: string
    normalPct?: number
    luckyPct?: number
    first?: boolean
}

export default function RarityHeading({ rarity, normalPct, luckyPct, first }: Props) {
    return (
        <h2 className={cn('mb-2.5 flex flex-wrap items-baseline gap-x-4', first ? 'mt-0' : 'mt-11')}>
            <span className={cn('text-sm font-semibold uppercase tracking-[0.05em]', rarityTextClass(rarity))}>{rarity}</span>
            {normalPct !== undefined && luckyPct !== undefined && (
                <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
                    Normal <b className="font-medium text-foreground">{normalPct}%</b>
                    <span className="ml-3">Lucky <b className="font-medium text-foreground">{luckyPct}%</b></span>
                </span>
            )}
        </h2>
    )
}
