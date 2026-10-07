import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize'
import { ChevronRight } from 'lucide-react'
import { proseComponents } from '@/app/components/prose/proseComponents'
import { cn } from '@/lib/utils'
import remarkChangelog from './remarkChangelog'

const sanitizeSchema: SanitizeSchema = {
    ...defaultSchema,
    clobberPrefix: '',
    attributes: {
        ...defaultSchema.attributes,
        li: [...(defaultSchema.attributes?.li ?? []), ['dataDelta', 'buff', 'nerf']],
    },
}

const DELTA_CHIP = {
    buff: { glyph: '▲', label: 'Buff', className: 'text-success bg-success/10 border-success/20' },
    nerf: { glyph: '▼', label: 'Nerf', className: 'text-destructive bg-destructive/10 border-destructive/20' },
} as const

const components: Components = {
    ...proseComponents,
    h1: ({ id, children }) => (
        <h1 id={id} className="scroll-mt-24 mt-12 mb-4 border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground first:mt-0">
            {children}
        </h1>
    ),
    h2: ({ id, children }) => (
        <h2 id={id} className="scroll-mt-24 mt-8 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {children}
        </h2>
    ),
    h3: ({ id, children }) => (
        <h3 id={id} className="scroll-mt-24 mt-6 mb-1.5 text-base font-semibold text-foreground [summary>&]:my-0">
            {children}
        </h3>
    ),
    p: ({ children }) => <p className="my-3">{children}</p>,
    ul: ({ children }) => <ul className="my-3 ml-5 list-disc space-y-1.5 marker:text-muted-foreground">{children}</ul>,
    ol: ({ children }) => <ol className="my-3 ml-5 list-decimal space-y-1.5 marker:text-muted-foreground">{children}</ol>,
    li: ({ children, ...props }) => {
        const delta = (props as Record<string, unknown>)['data-delta']
        const chip = delta === 'buff' || delta === 'nerf' ? DELTA_CHIP[delta] : null
        if (!chip) return <li className="pl-1">{children}</li>
        return (
            <li data-delta={delta as string} className="pl-1">
                <span
                    aria-label={chip.label}
                    title={chip.label}
                    className={cn('mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded-sm border px-1 align-[1px] font-mono text-xs leading-none', chip.className)}
                >
                    {chip.glyph}
                </span>
                {children}
            </li>
        )
    },
    details: ({ id, children }) => (
        <details id={id} className="group/feature scroll-mt-24 border-b border-border [&>:not(summary)]:pl-6 [&>:last-child]:pb-3">
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

export default function ChangelogBody({ body }: { body: string }) {
    return (
        <div className="text-sm leading-relaxed text-foreground">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks, remarkChangelog]}
                rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
                components={components}
            >
                {body}
            </ReactMarkdown>
        </div>
    )
}
