"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSanitize from 'rehype-sanitize'

export default function ArticleBody({ body }: { body: string }) {
    return (
        <div className="text-sm leading-relaxed text-foreground/90">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                    h1: ({ children }) => <h1 className="text-xl font-semibold tracking-tight text-foreground mt-8 mb-3">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold tracking-tight text-foreground mt-7 mb-2.5">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground mt-6 mb-2">{children}</h3>,
                    p:  ({ children }) => <p className="my-3">{children}</p>,
                    a:  ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>
                    ),
                    ul: ({ children }) => <ul className="my-3 ml-5 list-disc space-y-1.5 marker:text-muted-foreground">{children}</ul>,
                    ol: ({ children }) => <ol className="my-3 ml-5 list-decimal space-y-1.5 marker:text-muted-foreground">{children}</ol>,
                    li: ({ children }) => <li className="pl-1">{children}</li>,
                    blockquote: ({ children }) => (
                        <blockquote className="my-4 border-l-2 border-primary/40 pl-4 text-muted-foreground italic">{children}</blockquote>
                    ),
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => (
                        <code className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">{children}</code>
                    ),
                    pre: ({ children }) => (
                        <pre className="my-4 overflow-x-auto rounded-sm border border-border bg-muted/50 p-4 text-xs font-mono leading-relaxed">{children}</pre>
                    ),
                    hr: () => <hr className="my-6 border-border" />,
                    img: ({ src, alt }) => (
                        <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} className="my-4 rounded-sm border border-border max-w-full" />
                    ),
                }}
            >
                {body}
            </ReactMarkdown>
        </div>
    )
}
