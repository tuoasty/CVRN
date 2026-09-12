"use client"

import Image from 'next/image'
import ArticleBody from '@/app/(public)/articles/ArticleBody'
import { useSeasons } from '@/app/hooks/useSeasons'
import { type AuthorSelection } from '@/app/features/media/AuthorPicker'
import { type ArticleImageItem } from '@/app/features/articles/ArticleImagesManager'

interface Props {
    title: string
    body: string
    author: AuthorSelection | null
    seasonId: string | null
    images: ArticleImageItem[]
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function ArticlePreview({ title, body, author, seasonId, images }: Props) {
    const { seasons } = useSeasons()
    const seasonName = seasonId ? seasons.find(s => s.id === seasonId)?.name ?? null : null

    const refs = images.map(i => ({
        handle:      i.handle,
        url:         i.previewUrl,
        mediaPostId: i.mediaPostId ?? '',
    }))

    return (
        <div className="mx-auto max-w-[720px] space-y-6">
            <article className="space-y-6">
                <header className="space-y-4">
                    <h1 className="text-[30px] leading-tight font-semibold tracking-tight text-foreground">
                        {title || 'Untitled'}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        {author && (
                            <span className="flex items-center gap-2">
                                {author.avatarUrl && (
                                    <span className="relative h-6 w-6 flex-none overflow-hidden rounded-sm border border-border">
                                        <Image src={author.avatarUrl} alt={author.label} fill sizes="24px" className="object-cover" unoptimized />
                                    </span>
                                )}
                                <span className="font-medium text-foreground">{author.label}</span>
                            </span>
                        )}
                        {author && <span className="text-muted-foreground/50">·</span>}
                        <time className="font-mono tabular-nums">{formatDate(new Date().toISOString())}</time>
                        {seasonName && (
                            <>
                                <span className="text-muted-foreground/50">·</span>
                                <span>{seasonName}</span>
                            </>
                        )}
                    </div>
                </header>

                <ArticleBody body={body} images={refs} hasMatchHero={false} />
            </article>
        </div>
    )
}
