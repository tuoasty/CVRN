"use client"

import Image from 'next/image'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSanitize from 'rehype-sanitize'

const COVER_TOKEN = '[cover]'

const components: Components = {
    h1: ({ children }) => <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-10 mb-3">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-semibold tracking-tight text-foreground mt-9 mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-semibold uppercase tracking-wide text-foreground mt-7 mb-2">{children}</h3>,
    p:  ({ children }) => <p className="my-5">{children}</p>,
    a:  ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>
    ),
    ul: ({ children }) => <ul className="my-5 ml-6 list-disc space-y-2 marker:text-muted-foreground">{children}</ul>,
    ol: ({ children }) => <ol className="my-5 ml-6 list-decimal space-y-2 marker:text-muted-foreground">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    blockquote: ({ children }) => (
        <blockquote className="my-6 border-l border-border pl-4 text-muted-foreground italic">{children}</blockquote>
    ),
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
        <code className="rounded-sm bg-muted px-1.5 py-0.5 text-[0.9em] font-mono text-foreground">{children}</code>
    ),
    pre: ({ children }) => (
        <pre className="my-6 overflow-x-auto rounded-sm border border-border bg-muted/50 p-4 text-sm font-mono leading-relaxed">{children}</pre>
    ),
    hr: () => <hr className="my-8 border-border" />,
    img: ({ src, alt }) => (
        <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} className="my-6 rounded-sm border border-border max-w-full" />
    ),
}

function Prose({ children }: { children: string }) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeSanitize]} components={components}>
            {children}
        </ReactMarkdown>
    )
}

function Cover({ url }: { url: string }) {
    return (
        <figure className="my-8">
            <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-border bg-muted">
                <Image src={url} alt="" fill sizes="(max-width: 720px) 100vw, 680px" className="object-cover" unoptimized />
            </div>
        </figure>
    )
}

export default function ArticleBody({ body, coverUrl }: { body: string; coverUrl?: string | null }) {
    const splitAt = coverUrl ? body.indexOf(COVER_TOKEN) : -1

    return (
        <div className="mx-auto max-w-[68ch] text-[17px] leading-[1.7] text-foreground">
            {coverUrl && splitAt >= 0 ? (
                <>
                    <Prose>{body.slice(0, splitAt)}</Prose>
                    <Cover url={coverUrl} />
                    <Prose>{body.slice(splitAt + COVER_TOKEN.length)}</Prose>
                </>
            ) : coverUrl ? (
                <>
                    <Cover url={coverUrl} />
                    <Prose>{body}</Prose>
                </>
            ) : (
                <Prose>{body}</Prose>
            )}
        </div>
    )
}
