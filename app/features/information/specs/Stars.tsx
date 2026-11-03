import { cn } from '@/lib/utils'

const FILLED: Record<number, string> = {
    5: 'text-secondary',
    4: 'text-rarity-epic',
    3: 'text-rarity-rare',
}

export function specStarClass(stars: number): string {
    return FILLED[stars] ?? 'text-foreground'
}

export default function Stars({ stars, className }: { stars: number; className?: string }) {
    return (
        <span role="img" aria-label={`${stars} stars`} className={cn('whitespace-nowrap tracking-[1px]', className)}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} aria-hidden className={i <= stars ? specStarClass(stars) : 'text-border'}>★</span>
            ))}
        </span>
    )
}
