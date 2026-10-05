"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Image as ImageIcon, Play, ArrowRight } from 'lucide-react'
import VideoEmbedDialog from '@/app/features/media/VideoEmbedDialog'
import GFXImageDialog from '@/app/features/media/GFXImageDialog'
import { resolveMediaThumbnail } from '@/app/features/media/mediaUtils'
import type { MediaPost } from '@/server/domains/media'

function GfxCard({ post, onOpen }: { post: MediaPost; onOpen: (p: MediaPost) => void }) {
    return (
        <div
            className="flex flex-col border border-border rounded-sm overflow-hidden cursor-pointer"
            onClick={() => post.image_url && onOpen(post)}
        >
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                {post.image_url && (
                    <Image src={post.image_url} alt={post.title} fill className="object-cover" sizes="240px" />
                )}
            </div>
            <div className="px-2 py-1.5 flex-shrink-0">
                <p className="text-xs font-semibold truncate">{post.title}</p>
                {post.description && (
                    <p className="text-[10px] text-muted-foreground truncate">{post.description}</p>
                )}
            </div>
        </div>
    )
}

function FeatureCard({ post, onPlay }: { post: MediaPost; onPlay: (url: string) => void }) {
    const thumbnail = resolveMediaThumbnail(post.image_url, post.video_url)
    return (
        <div
            className="flex flex-col border border-border rounded-sm overflow-hidden cursor-pointer"
            onClick={() => post.video_url && onPlay(post.video_url)}
        >
            <div className="relative w-full bg-muted" style={{ aspectRatio: '16/9' }}>
                {thumbnail && (
                    <Image src={thumbnail} alt={post.title} fill className="object-cover" sizes="240px" unoptimized />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                        <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                    </div>
                </div>
            </div>
            <div className="px-2 py-1.5 flex-shrink-0">
                <p className="text-xs font-semibold truncate">{post.title}</p>
                {post.description && (
                    <p className="text-[10px] text-muted-foreground truncate">{post.description}</p>
                )}
            </div>
        </div>
    )
}

export default function MediaSidebar({ posts }: { posts: MediaPost[] }) {
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [gfxPost, setGfxPost] = useState<MediaPost | null>(null)

    const pinned  = posts.filter(p => p.is_pinned)
    const gfx     = pinned.filter(p => p.type === 'gfx')
    const gfxTop  = gfx[0] ?? null
    const gfxRest = gfx.slice(1, 3)
    const videos  = pinned.filter(p => p.type === 'video').slice(0, 2)
    const features = pinned.filter(p => p.type === 'feature').slice(0, 2)
    const hasAny  = gfx.length > 0 || videos.length > 0 || features.length > 0

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
                {gfxTop && <GfxCard post={gfxTop} onOpen={setGfxPost} />}

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

                {features.map(post => (
                    <FeatureCard key={post.id} post={post} onPlay={setVideoUrl} />
                ))}

                {gfxRest.map(post => (
                    <GfxCard key={post.id} post={post} onOpen={setGfxPost} />
                ))}

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
