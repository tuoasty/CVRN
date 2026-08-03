"use client"

import { useState } from 'react'
import Image from 'next/image'
import { ExternalLink, Play } from 'lucide-react'
import { getYoutubeId, getYoutubePoster, toEmbedUrl, withAutoplay } from '@/app/features/media/mediaUtils'
import type { MediaPost } from '@/server/domains/media'

export default function MatchVodSection({ post }: { post: MediaPost }) {
    const [playing, setPlaying] = useState(false)
    const [posterQuality, setPosterQuality] = useState<'maxres' | 'hq'>('maxres')

    if (!post.video_url) return null

    const embedUrl = toEmbedUrl(post.video_url)
    const youtubeId = getYoutubeId(post.video_url)
    const poster = youtubeId ? getYoutubePoster(youtubeId, posterQuality) : null
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
                <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-border bg-black">
                    {playing && embedUrl ? (
                        <iframe
                            src={withAutoplay(embedUrl)}
                            className="absolute inset-0 w-full h-full"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                            title={post.title}
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setPlaying(true)}
                            disabled={!embedUrl}
                            className="group absolute inset-0 w-full h-full disabled:cursor-not-allowed"
                            aria-label={`Play ${post.title}`}
                        >
                            {poster && (
                                <Image
                                    src={poster}
                                    alt=""
                                    fill
                                    unoptimized
                                    sizes="(min-width: 1024px) 1030px, 100vw"
                                    className="object-cover"

                                    onLoad={e => {
                                        if (e.currentTarget.naturalWidth <= 120) setPosterQuality('hq')
                                    }}
                                    onError={() => setPosterQuality('hq')}
                                />
                            )}
                            <span className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors" />
                            <span className="absolute inset-0 flex items-center justify-center">
                                <span className="flex items-center justify-center w-16 h-16 rounded-full border border-white/60 bg-white/10 backdrop-blur-[2px] transition-transform group-hover:scale-105">
                                    <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                                </span>
                            </span>
                            {!embedUrl && (
                                <span className="absolute bottom-3 left-3 text-xs text-white/70">
                                    This video can&apos;t be embedded.
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </section>
    )
}
