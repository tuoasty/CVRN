import type { Components } from 'react-markdown'

export function MarkdownImage({ src, alt }: { src?: string | Blob; alt?: string }) {
    return <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} className="my-6 rounded-sm border border-border max-w-full" />
}

export const proseComponents: Components = {
    h1: ({ children }) => <h1 className="clear-both text-2xl font-semibold tracking-tight text-foreground mt-10 mb-3">{children}</h1>,
    h2: ({ children }) => <h2 className="clear-both text-xl font-semibold tracking-tight text-foreground mt-9 mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="clear-both text-base font-semibold uppercase tracking-wide text-foreground mt-7 mb-2">{children}</h3>,
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
        <pre className="clear-both my-6 overflow-x-auto rounded-sm border border-border bg-muted/50 p-4 text-sm font-mono leading-relaxed">{children}</pre>
    ),
    hr: () => <hr className="clear-both my-8 border-border" />,
    img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} />,
}
