"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Image as ImageIcon, Play, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/app/components/ui/skeleton'
import { useAllMediaPosts } from '@/app/hooks/useMediaPosts'
import VideoEmbedDialog from '@/app/features/media/VideoEmbedDialog'
import GFXImageDialog from '@/app/features/media/GFXImageDialog'
import { resolveMediaThumbnail } from '@/app/features/media/mediaUtils'
import type { MediaPost } from '@/server/domains/media'

// Proportional slot system derived from clip = 9:16 at 4 units.
// 1 unit = clip_height/4 = (16w/9)/4 = 4w/9
// clip  (4u):    aspect-ratio 9/16  (portrait TikTok)
// gfx   (~1.3u): aspect-ratio 16/9  (standard widescreen)
// video (0.75u): aspect-ratio 3/1   (compact row, thumbnail left + text right)
// All three scale together with sidebar width.

export default function MediaSidebar() {
    const { posts, isLoading } = useAllMediaPosts()
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [gfxPost, setGfxPost] = useState<MediaPost | null>(null)

    const pinned = posts.filter(p => p.is_pinned)
    const gfx    = pinned.find(p => p.type === 'gfx') ?? null
    const videos = pinned.filter(p => p.type === 'video').slice(0, 2)
    const clip   = pinned.find(p => p.type === 'clip') ?? null
    const hasAny = !!gfx || videos.length > 0 || !!clip

    if (isLoading) {
        return (
            <div className="panel p-3 space-y-3">
                <div className="rounded-sm overflow-hidden border border-border/30">
                    <Skeleton className="w-full" style={{ aspectRatio: '16/9' }} />
                    <Skeleton className="h-7 w-full rounded-none" />
                </div>
                <Skeleton className="w-full rounded-sm" style={{ aspectRatio: '3/1' }} />
                <Skeleton className="w-full rounded-sm" style={{ aspectRatio: '9/16' }} />
            </div>
        )
    }

    if (!hasAny) {
        return (
            <div className="panel p-4 bg-gradient-to-br from-muted/30 to-transparent min-h-[200px]">
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    <h4 className="text-xs font-bold text-muted-foreground">Media</h4>
                    <p className="text-[10px] text-muted-foreground/70 text-center">No pinned posts yet</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="panel p-3 space-y-3">
                {/* GFX — image is 16:9, title band is extra height below */}
                {gfx && (
                    <div
                        className="flex flex-col border border-border rounded-sm overflow-hidden cursor-pointer"
                        onClick={() => gfx.image_url && setGfxPost(gfx)}
                    >
                        <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                            {gfx.image_url && (
                                <Image src={gfx.image_url} alt={gfx.title} fill className="object-cover" sizes="240px" />
                            )}
                        </div>
                        <div className="px-2 py-1.5 flex-shrink-0">
                            <p className="text-xs font-semibold truncate">{gfx.title}</p>
                            {gfx.description && (
                                <p className="text-[10px] text-muted-foreground truncate">{gfx.description}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Videos — 3:1 compact row (0.75u), thumbnail left + text right */}
                {videos.map(post => {
                    const thumbnail = resolveMediaThumbnail(post.image_url, post.video_url)
                    return (
                        <div
                            key={post.id}
                            style={{ aspectRatio: '3/1' }}
                            className="flex items-center border border-border rounded-sm overflow-hidden cursor-pointer"
                            onClick={() => post.video_url && setVideoUrl(post.video_url)}
                        >
                            <div className="h-full aspect-video relative flex-shrink-0 bg-muted">
                                {thumbnail && (
                                    <Image src={thumbnail} alt={post.title} fill className="object-cover" sizes="120px" unoptimized />
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Play className="h-3 w-3 text-white fill-white ml-0.5" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 px-2">
                                <p className="text-xs font-semibold line-clamp-2 leading-tight">{post.title}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )
                })}

                {/* Clip — 9:16 TikTok portrait ratio */}
                {clip && (
                    <iframe
                        src={`https://www.tiktok.com/embed/v3/${clip.video_url}`}
                        className="block border-0 rounded-sm w-full"
                        style={{ aspectRatio: '9/16' }}
                        allowFullScreen
                        allow="encrypted-media"
                    />
                )}

                <Link href="/media" className="flex items-center justify-center gap-1 text-xs text-primary font-medium hover:underline pt-1">
                    View all <ArrowRight className="h-3 w-3" />
                </Link>
            </div>

            {videoUrl && (
                <VideoEmbedDialog
                    url={videoUrl}
                    open={!!videoUrl}
                    onOpenChange={open => !open && setVideoUrl(null)}
                />
            )}

            {gfxPost?.image_url && (
                <GFXImageDialog
                    url={gfxPost.image_url}
                    title={gfxPost.title}
                    open={!!gfxPost}
                    onOpenChange={open => !open && setGfxPost(null)}
                />
            )}
        </>
    )
}
