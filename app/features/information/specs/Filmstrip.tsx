import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatHeight } from '@/shared/utils/height'
import SpecPhoto from '@/app/features/spec/SpecPhoto'
import type { PublicSpecCard } from '@/server/domains/spec'
import FilmstripScroller from './FilmstripScroller'
import Stars from './Stars'
import { galleryHref, galleryLabel, type GalleryKey } from './galleryKey'

const LABEL = 'text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground'

interface Props {
    group: GalleryKey
    specs: PublicSpecCard[]
    currentId: string
}

export default function Filmstrip({ group, specs, currentId }: Props) {
    const back = galleryHref(group)
    const label = galleryLabel(group)
    const startsVaulted = (i: number) => specs[i].is_vaulted && (i === 0 || !specs[i - 1].is_vaulted)
    const hasVaulted = specs.some(s => s.is_vaulted)

    return (
        <nav aria-label={`${label} specs`}>
            <Link href={back} className="mb-3.5 inline-block text-xs text-muted-foreground transition-colors hover:text-foreground">
                ‹ All {label}
            </Link>

            <ul className="hidden min-[900px]:block">
                {specs.map((spec, i) => {
                    const current = spec.id === currentId
                    return (
                        <li key={spec.id}>
                            {startsVaulted(i) && <p className={`${LABEL} mb-1.5 mt-5`}>Vaulted</p>}
                            <Link
                                href={`/information/specs/${spec.slug}`}
                                aria-current={current ? 'page' : undefined}
                                className={cn(
                                    '-mx-2 grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 px-2 py-1.5 transition-colors duration-150 motion-reduce:transition-none',
                                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50',
                                    current ? 'bg-muted/45' : 'hover:bg-muted/30',
                                )}
                            >
                                <SpecPhoto url={spec.photo_url} name={spec.name} sizes="40px" className={cn(!current && 'opacity-60')} />
                                <span className="min-w-0">
                                    <span className={cn('block truncate text-sm leading-[17px]', current ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground')}>
                                        {spec.name}
                                    </span>
                                    {spec.stars !== null && <Stars stars={spec.stars} className="text-xs" />}
                                </span>
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatHeight(spec.height)}</span>
                            </Link>
                        </li>
                    )
                })}
            </ul>

            <FilmstripScroller className="relative -mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-2 min-[900px]:hidden">
                <ul className={cn('flex gap-3', hasVaulted && 'pt-5')}>
                    {specs.map((spec, i) => {
                        const current = spec.id === currentId
                        return (
                            <li key={spec.id} className={cn('w-[88px] shrink-0 snap-start', startsVaulted(i) && 'relative ml-4')}>
                                {startsVaulted(i) && <span className={`${LABEL} absolute -top-5 left-0`}>Vaulted</span>}
                                <Link
                                    href={`/information/specs/${spec.slug}`}
                                    aria-current={current ? 'page' : undefined}
                                    className="block focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    <SpecPhoto url={spec.photo_url} name={spec.name} sizes="88px" className={cn(!current && 'opacity-60')} />
                                    <span
                                        className={cn(
                                            'mt-1.5 block truncate text-xs',
                                            current ? 'font-semibold text-foreground underline decoration-2 underline-offset-4' : 'text-muted-foreground',
                                        )}
                                    >
                                        {spec.name}
                                    </span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </FilmstripScroller>
        </nav>
    )
}
