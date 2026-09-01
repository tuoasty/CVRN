"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import VideoEmbedDialog from '@/app/features/media/VideoEmbedDialog'
import GFXImageDialog from '@/app/features/media/GFXImageDialog'
import { resolveMediaThumbnail } from '@/app/features/media/mediaUtils'

type Props = {
    title: string
    gfxUrl: string | null
    vodUrl: string | null
}

export default function ArticleMatchMedia({ title, gfxUrl, vodUrl }: Props) {
    const [videoOpen, setVideoOpen] = useState(false)
    const [gfxOpen, setGfxOpen] = useState(false)

    if (!gfxUrl && !vodUrl) return null

    const thumbnail = resolveMediaThumbnail(gfxUrl, vodUrl)

    return (
        <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Match media</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gfxUrl && (
                    <button
                        type="button"
                        onClick={() => setGfxOpen(true)}
                        className="panel overflow-hidden text-left transition-colors hover:border-primary/30"
                    >
                        <div className="relative aspect-video bg-muted">
                            <Image src={gfxUrl} alt={`${title} GFX`} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" unoptimized />
                        </div>
                        <p className="px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide">GFX</p>
                    </button>
                )}
                {vodUrl && (
                    <button
                        type="button"
                        onClick={() => setVideoOpen(true)}
                        className="panel overflow-hidden text-left transition-colors hover:border-primary/30"
                    >
                        <div className="relative aspect-video bg-muted">
                            {thumbnail && (
                                <Image src={thumbnail} alt={`${title} VOD`} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" unoptimized />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                                    <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                                </div>
                            </div>
                        </div>
                        <p className="px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide">VOD</p>
                    </button>
                )}
            </div>

            {vodUrl && (
                <VideoEmbedDialog url={vodUrl} open={videoOpen} onOpenChange={setVideoOpen} />
            )}
            {gfxUrl && (
                <GFXImageDialog url={gfxUrl} title={title} open={gfxOpen} onOpenChange={setGfxOpen} />
            )}
        </div>
    )
}
