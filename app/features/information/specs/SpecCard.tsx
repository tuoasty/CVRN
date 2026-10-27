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
            className={cn(
                'group relative block overflow-hidden outline-1 -outline-offset-1 outline-muted-foreground',
                'hover:outline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                dimmed && 'opacity-60',
            )}
        >
            <SpecPhoto url={spec.photo_url} name={spec.name} sizes="(min-width:1024px) 220px, 45vw" />
            <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/80 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 px-3 pb-3">
                <span className="block text-sm font-semibold leading-[18px] text-white">{spec.name}</span>
                <span className="mt-1 flex items-center justify-between gap-2">
                    {spec.stars !== null ? <Stars stars={spec.stars} className="text-xs" /> : <span />}
                    <span className="shrink-0 font-mono text-xs tabular-nums text-white">{formatHeight(spec.height)}</span>
                </span>
            </span>
        </Link>
    )
}
