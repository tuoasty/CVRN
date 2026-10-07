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
        span: [...(defaultSchema.attributes?.span ?? []), ['dataDelta', 'buff', 'nerf']],
        img: [
            ...(defaultSchema.attributes?.img ?? []),
            'dataImage',
            ['dataPlacement', 'left', 'center', 'right'],
            ['dataWidth', '25', '50', '75'],
        ],
    },
}

const DELTA_MARK = {
    buff: { label: 'Buff', className: 'text-success' },
    nerf: { label: 'Nerf', className: 'text-destructive rotate-180' },
} as const

const components: Components = {
    ...proseComponents,
    h1: ({ id, children }) => (
        <h1 id={id} className="clear-both scroll-mt-24 mt-12 mb-4 border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground first:mt-0 [summary>&]:m-0 [summary>&]:border-0 [summary>&]:p-0">
            {children}
        </h1>
    ),
    h2: ({ id, children }) => (
        <h2 id={id} className="clear-both scroll-mt-24 mt-8 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground [summary>&]:my-0">
            {children}
        </h2>
    ),
    h3: ({ id, children }) => (
        <h3 id={id} className="clear-both scroll-mt-24 mt-6 mb-1.5 text-base font-semibold text-foreground [summary>&]:my-0">
            {children}
        </h3>
    ),
    p: ({ children }) => <p className="my-3">{children}</p>,
    ul: ({ children }) => <ul className="my-3 ml-5 list-disc space-y-1.5 marker:text-muted-foreground">{children}</ul>,
    ol: ({ start, children }) => <ol start={start} className="my-3 ml-5 list-decimal space-y-1.5 marker:text-muted-foreground">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    span: ({ children, ...props }) => {
        const delta = (props as Record<string, unknown>)['data-delta']
        if (delta !== 'buff' && delta !== 'nerf') return <span>{children}</span>
        const mark = DELTA_MARK[delta]
        return (
            <span data-delta={delta} role="img" aria-label={mark.label} title={mark.label} className="mr-1.5 inline-flex align-baseline">
                <Triangle aria-hidden className={cn('h-[0.7em] w-[0.7em] fill-current stroke-none', mark.className)} />
            </span>
        )
    },
    details: ({ id, children }) => (
        <details id={id} className="group/feature flow-root scroll-mt-24 border-b border-border [&>:not(summary)]:pl-6 [&>:last-child]:pb-3">
            {children}
        </details>
    ),
    summary: ({ children }) => (
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2.5 font-medium text-foreground hover:text-primary [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/feature:rotate-90" />
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
        <div className="flow-root text-sm leading-relaxed text-foreground">/
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
