"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { getYoutubeId, getYoutubePoster, toEmbedUrl, withAutoplay } from '@/app/features/media/mediaUtils'

export default function VodFacade({ videoUrl, title, sizes = "(min-width: 1024px) 1030px, 100vw" }: { videoUrl: string; title: string; sizes?: string }) {
    const [playing, setPlaying] = useState(false)
    const [posterQuality, setPosterQuality] = useState<'maxres' | 'hq'>('maxres')

    const embedUrl = toEmbedUrl(videoUrl)
    const youtubeId = getYoutubeId(videoUrl)
    const poster = youtubeId ? getYoutubePoster(youtubeId, posterQuality) : null

    return (
        <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-border bg-black">
            {playing && embedUrl ? (
                <iframe
                    src={withAutoplay(embedUrl)}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={title}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    disabled={!embedUrl}
                    className="group absolute inset-0 w-full h-full disabled:cursor-not-allowed"
                    aria-label={`Play ${title}`}
                >
                    {poster && (
                        <Image
                            src={poster}
                            alt=""
                            fill
                            unoptimized
                            sizes={sizes}
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
    )
}
