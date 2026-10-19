import { cn } from '@/lib/utils'

const FILLED: Record<number, string> = {
    5: 'text-secondary',
    4: 'text-rarity-epic',
    3: 'text-rarity-rare',
}

export default function Stars({ stars, className }: { stars: number; className?: string }) {
    return (
        <span role="img" aria-label={`${stars} stars`} className={cn('whitespace-nowrap tracking-[1px]', className)}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} aria-hidden className={i <= stars ? (FILLED[stars] ?? 'text-foreground') : 'text-border'}>★</span>
            ))}
        </span>
    )
}
