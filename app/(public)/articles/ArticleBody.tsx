"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSanitize from 'rehype-sanitize'
import { cn } from '@/lib/utils'
import { proseComponents } from '@/app/components/prose/proseComponents'

type Placement = 'left' | 'center' | 'right'
type Width = 25 | 50 | 75

interface ArticleImageRef {
    handle: string
    url: string | null
    mediaPostId: string
}

const TOKEN_RE = /\[(cover|image:[a-z0-9]+)((?::(?:left|center|right|25|50|75)){0,2})\]/gi

type Segment =
    | { type: 'text'; text: string }
    | { type: 'image'; handle: string; placement?: Placement; width?: Width }

function tokenize(body: string): Segment[] {
    const segments: Segment[] = []
    let last = 0
    let m: RegExpExecArray | null
    TOKEN_RE.lastIndex = 0
    while ((m = TOKEN_RE.exec(body)) !== null) {
        if (m.index > last) segments.push({ type: 'text', text: body.slice(last, m.index) })
        const inner = m[1].toLowerCase()
        const handle = inner === 'cover' ? 'cover' : inner.slice('image:'.length)
        let placement: Placement | undefined
        let width: Width | undefined
        for (const part of (m[2] ?? '').toLowerCase().split(':')) {
            if (part === 'left' || part === 'center' || part === 'right') placement = part
            else if (part === '25' || part === '50' || part === '75') width = Number(part) as Width
        }
        segments.push({ type: 'image', handle, placement, width })
        last = m.index + m[0].length
    }
    if (last < body.length) segments.push({ type: 'text', text: body.slice(last) })
    return segments
}

function Prose({ children }: { children: string }) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeSanitize]} components={proseComponents}>
            {children}
        </ReactMarkdown>
    )
}

function ArticleImage({ url, placement, width }: { url: string; placement: Placement; width?: Width }) {
    if (placement === 'center') {
        return (
            <figure className="clear-both my-8">
                <img src={url} alt="" loading="lazy" className="w-full h-auto rounded-sm border border-border" />
            </figure>
        )
    }
    const widthClass = width === 25 ? 'w-1/4' : width === 75 ? 'w-3/4' : 'w-1/2'
    return (
        <figure
            className={cn(
                'my-2',
                widthClass,
                placement === 'left' ? 'float-left mr-5 mb-3' : 'float-right ml-5 mb-3',
            )}
        >
            <img src={url} alt="" loading="lazy" className="w-full h-auto rounded-sm border border-border" />
        </figure>
    )
}

export default function ArticleBody({ body, images, hasMatchHero }: { body: string; images: ArticleImageRef[]; hasMatchHero?: boolean }) {
    const byHandle = new Map(images.map(i => [i.handle, i]))
    const segments = tokenize(body)
    const coverTokened = segments.some(s => s.type === 'image' && s.handle === 'cover')
    const cover = byHandle.get('cover')
    const shouldLeadCover = !hasMatchHero && !coverTokened && !!cover?.url

    return (
        <div className="mx-auto max-w-[68ch] text-[17px] leading-[1.7] text-foreground">
            {shouldLeadCover && cover?.url && <ArticleImage url={cover.url} placement="center" />}
            {segments.map((seg, i) => {
                if (seg.type === 'text') return <Prose key={i}>{seg.text}</Prose>
                const img = byHandle.get(seg.handle)
                if (!img?.url) return null
                return <ArticleImage key={i} url={img.url} placement={seg.placement ?? 'center'} width={seg.width} />
            })}
            <div className="clear-both" />
        </div>
    )
}
