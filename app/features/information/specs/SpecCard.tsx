import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatHeight } from '@/shared/utils/height'
import SpecPhoto from '@/app/features/spec/SpecPhoto'
import type { PublicSpecCard } from '@/server/domains/spec'
import Stars from './Stars'

export default function SpecCard({ spec, dimmed }: { spec: PublicSpecCard; dimmed?: boolean }) {
    return (
        <Link
            href={`/information/specs/${spec.slug}`}
            className={cn('group block focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', dimmed && 'opacity-60')}
        >
            <SpecPhoto
                url={spec.photo_url}
                name={spec.name}
                sizes="(min-width:1024px) 220px, 45vw"
                className="outline-1 outline-muted-foreground transition-[outline-color] group-hover:outline"
            />
            <span className="mt-2 flex items-baseline justify-between gap-2">
                <span className="min-w-0 text-sm font-semibold leading-[18px] text-foreground">{spec.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-foreground">{formatHeight(spec.height)}</span>
            </span>
            <Stars stars={spec.stars} className="mt-0.5 block text-xs" />
        </Link>
    )
}
