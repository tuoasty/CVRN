"use client"

import { ExternalLink } from 'lucide-react'
import VodFacade from '@/app/features/media/VodFacade'
import type { MediaPost } from '@/server/domains/media'

export default function MatchVodSection({ post }: { post: MediaPost }) {
    if (!post.video_url) return null

    const hostLabel = post.video_url.includes('twitch.tv') ? 'Twitch' : 'YouTube'

    return (
        <section className="space-y-3">
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Full match
                    </span>
                    <h2 className="text-base font-semibold tracking-tight mt-0.5">{post.title}</h2>
                </div>
                <a
                    href={post.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-sm px-2.5 py-1.5 hover:text-foreground hover:border-primary/30 transition-colors"
                >
                    Watch on {hostLabel}
                    <ExternalLink className="h-3 w-3" />
                </a>
            </div>

            {}
            <div className="mx-auto w-full" style={{ maxWidth: 'min(100%, calc((100vh - 12rem) * 16 / 9))' }}>
                <VodFacade videoUrl={post.video_url} title={post.title} />
            </div>
        </section>
    )
}
