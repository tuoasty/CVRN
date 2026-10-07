import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize'
import { ChevronRight, Triangle } from 'lucide-react'
import { MarkdownImage, proseComponents } from '@/app/components/prose/proseComponents'
import ProseImage from '@/app/components/prose/ProseImage'
import type { ImagePlacement, ImageWidth } from '@/shared/utils/imageTokens'
import { cn } from '@/lib/utils'
import remarkChangelog, { prepareChangelog } from './remarkChangelog'

const sanitizeSchema: SanitizeSchema = {
    ...defaultSchema,
    clobberPrefix: '',
    attributes: {
        ...defaultSchema.attributes,
        span: [...(defaultSchema.attributes?.span ?? []), ['dataDelta', 'buff', 'nerf', 'rework'], ['dataTag', 'new']],
        li: [...(defaultSchema.attributes?.li ?? []), ['dataMarker', 'buff', 'nerf', 'rework']],
        img: [
            ...(defaultSchema.attributes?.img ?? []),
            'dataImage',
            ['dataPlacement', 'left', 'center', 'right'],
            ['dataWidth', '25', '50', '75'],
        ],
    },
}

type DeltaKind = 'buff' | 'nerf' | 'rework'

const DELTA_LABEL: Record<DeltaKind, string> = { buff: 'Buff', nerf: 'Nerf', rework: 'Rework' }

function isDelta(value: unknown): value is DeltaKind {
    return value === 'buff' || value === 'nerf' || value === 'rework'
}

function DeltaGlyph({ delta }: { delta: DeltaKind }) {
    if (delta === 'rework') {
        return (
            <svg aria-hidden viewBox="0 0 24 24" className="size-full fill-none stroke-secondary stroke-[3.2] [stroke-linecap:round]">
                <path d="M3 14.5c2.2-4 5.4-4.6 9-1.5s6.8 2.5 9-1.5" />
            </svg>
        )
    }
    return <Triangle aria-hidden className={cn('size-full fill-current stroke-none', delta === 'buff' ? 'text-success' : 'rotate-180 text-destructive')} />
}

const LIST_MARKER = cn(
    '[&>[data-delta]]:absolute [&>[data-delta]]:mr-0',
    '[&>[data-delta]]:right-[calc(100%_+_5.7px_+_0.18em)] [&>[data-delta]]:top-[0.845em]',
    '[&>[data-delta]]:size-[0.36em] [&>[data-delta]]:translate-x-1/2 [&>[data-delta]]:-translate-y-1/2',
    '[&[data-marker=rework]>[data-delta]]:size-[0.48em]',
)

const SUMMARY_HOVER = '[summary:hover>&]:text-primary'

const components: Components = {
    ...proseComponents,
    h1: ({ id, children }) => (
        <h1 id={id} className={cn('clear-both scroll-mt-24 mt-14 mb-1 text-4xl font-semibold tracking-[-0.03em] text-foreground first:mt-0 [summary>&]:m-0', SUMMARY_HOVER)}>
            {children}
        </h1>
    ),
    h2: ({ id, children }) => (
        <h2 id={id} className={cn('clear-both scroll-mt-24 mt-7 mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground [h1+&]:mt-4 [summary>&]:my-0', SUMMARY_HOVER)}>
            {children}
        </h2>
    ),
    h3: ({ id, children }) => (
        <h3 id={id} className={cn('clear-both scroll-mt-24 mt-5 mb-1 text-lg font-semibold text-foreground [h2+&]:mt-1.5 [summary>&]:my-0', SUMMARY_HOVER)}>
            {children}
        </h3>
    ),
    p: ({ children }) => <p className="my-3">{children}</p>,
    ul: ({ children }) => <ul className="my-3 ml-5 list-disc space-y-1.5 marker:text-muted-foreground">{children}</ul>,
    ol: ({ start, children }) => <ol start={start} className="my-3 ml-5 list-decimal space-y-1.5 marker:text-muted-foreground">{children}</ol>,
    li: ({ children, ...props }) => {
        const marker = (props as Record<string, unknown>)['data-marker']
        if (!isDelta(marker)) return <li className="pl-1">{children}</li>
        return (
            <li data-marker={marker} className={cn('relative list-none pl-1', LIST_MARKER)}>
                {children}
            </li>
        )
    },
    span: ({ children, ...props }) => {
        const attrs = props as Record<string, unknown>
        if (attrs['data-tag'] === 'new') {
            return <span data-tag="new" className="mr-[0.35em] font-semibold text-primary">NEW</span>
        }
        const delta = attrs['data-delta']
        if (!isDelta(delta)) return <span>{children}</span>
        return (
            <span
                data-delta={delta}
                role="img"
                aria-label={DELTA_LABEL[delta]}
                title={DELTA_LABEL[delta]}
                className="mr-1.5 inline-flex h-[0.7em] w-[1em] shrink-0 items-center justify-center align-baseline"
            >
                <DeltaGlyph delta={delta} />
            </span>
        )
    },
    details: ({ id, children }) => (
        <details id={id} className="group/feature flow-root scroll-mt-24 [&>:not(summary)]:pl-6 [&>:last-child]:pb-2">
            {children}
        </details>
    ),
    summary: ({ children }) => (
        <summary className="flex cursor-pointer list-none items-center gap-2 py-1.5 text-foreground hover:text-primary [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-open/feature:rotate-90" />
            {children}
        </summary>
    ),
}

export interface ChangelogImage {
    name: string
    url: string
    caption: string | null
}

const WIDTHS: Record<string, ImageWidth> = { '25': 25, '50': 50, '75': 75 }

function withImages(images: ChangelogImage[]): Components {
    const byName = new Map(images.map(image => [image.name, image]))
    return {
        ...components,
        img: ({ node: _node, ...props }) => {
            const attrs = props as Record<string, unknown>
            const name = attrs['data-image']
            if (typeof name !== 'string') return <MarkdownImage src={props.src} alt={props.alt} />
            const image = byName.get(name)
            if (!image) return null
            const placement = (attrs['data-placement'] as ImagePlacement | undefined) ?? 'center'
            const width = WIDTHS[String(attrs['data-width'])]
            return <ProseImage url={image.url} placement={placement} width={width} caption={image.caption} />
        },
    }
}

export default function ChangelogBody({ body, images = [] }: { body: string; images?: ChangelogImage[] }) {
    const { source, toggles } = prepareChangelog(body)
    return (
        <div className="flow-root text-sm leading-relaxed text-foreground">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks, [remarkChangelog, { toggles }]]}
                rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
                components={withImages(images)}
            >
                {source}
            </ReactMarkdown>
        </div>
    )
}
