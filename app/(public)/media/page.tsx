"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Play, Pin } from 'lucide-react'
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader"
import { Badge } from '@/app/components/ui/badge'
import { Skeleton } from '@/app/components/ui/skeleton'
import { useAllMediaPosts } from '@/app/hooks/useMediaPosts'
import VideoEmbedDialog from '@/app/features/media/VideoEmbedDialog'
import GFXImageDialog from '@/app/features/media/GFXImageDialog'
import { resolveMediaThumbnail } from '@/app/features/media/mediaUtils'
import { cn } from '@/lib/utils'
import type { MediaPost } from '@/server/domains/media'

const TYPE_COLORS: Record<string, string> = {
    gfx:   'bg-violet-500/20 text-violet-400 border-violet-500/30',
    video: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    news:  'bg-green-500/20 text-green-400 border-green-500/30',
    recap: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    clip:  'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

type FilterType = 'all' | 'gfx-videos' | 'clips'

// Portrait iframe card for clips.
// compact=true: pure 9:16 cell for the 3-col grid (no padding, no footer).
// padX: horizontal inset for the All tab (default px-6 desktop, px-4 mobile).
function ClipCard({ post, padX = 'px-6', compact = false }: { post: MediaPost; padX?: string; compact?: boolean }) {
    if (compact) {
        return (
            <div className="rounded-sm overflow-hidden border border-border" style={{ aspectRatio: '9/16' }}>
                <iframe
                    src={`https://www.tiktok.com/embed/v3/${post.video_url}`}
                    allowFullScreen
                    allow="encrypted-media"
                    className="block border-0 w-full h-full"
                />
            </div>
        )
    }
    return (
        <div className="panel overflow-hidden">
            <div className={padX}>
                <iframe
                    src={`https://www.tiktok.com/embed/v3/${post.video_url}`}
                    allowFullScreen
                    allow="encrypted-media"
                    className="block border-0 w-full"
                    style={{ aspectRatio: '9/16' }}
                />
            </div>
            <div className="px-3 py-2 flex items-center justify-between gap-2">
                {post.is_pinned && <Pin className="h-3 w-3 text-muted-foreground/60 fill-muted-foreground/60 flex-shrink-0" />}
                <p className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
            </div>
        </div>
    )
}

function PostRow({ post, onVideoClick, onGfxClick }: {
    post: MediaPost
    onVideoClick: (url: string) => void
    onGfxClick: (post: MediaPost) => void
}) {
    const isVideo = post.type === 'video'
    const thumbnail = resolveMediaThumbnail(post.image_url, post.video_url)

    function handleClick() {
        if (isVideo && post.video_url) onVideoClick(post.video_url)
        else if (post.type === 'gfx' && post.image_url) onGfxClick(post)
    }

    const isClickable = (isVideo && !!post.video_url) || (post.type === 'gfx' && !!post.image_url)

    return (
        <div
            className={cn(
                'panel flex gap-0 overflow-hidden transition-colors hover:border-primary/30',
                isClickable ? 'cursor-pointer' : ''
            )}
            onClick={handleClick}
        >
            <div className="relative w-48 sm:w-64 flex-shrink-0 aspect-video bg-muted self-stretch">
                {thumbnail ? (
                    <Image
                        src={thumbnail}
                        alt={post.title}
                        fill
                        sizes="(max-width: 640px) 192px, 256px"
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                )}
                {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                            <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                        </div>
                    </div>
                )}
                {post.is_pinned && (
                    <div className="absolute top-1.5 right-1.5 z-10">
                        <Pin className="h-3 w-3 text-white/70 fill-white/70" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0 p-4 flex flex-col justify-between gap-2">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                            variant="outline"
                            className={cn('rounded-sm text-[10px] uppercase tracking-wide font-semibold', TYPE_COLORS[post.type] ?? '')}
                        >
                            {post.type}
                        </Badge>
                        {post.match_id && (
                            <Badge variant="outline" className="rounded-sm text-[9px] uppercase tracking-wide">
                                Match
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm font-semibold leading-snug line-clamp-2">{post.title}</p>
                    {post.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{post.description}</p>
                    )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                    {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
            </div>
        </div>
    )
}

function PostRowSkeleton() {
    return (
        <div className="panel flex overflow-hidden gap-0">
            <Skeleton className="w-48 sm:w-64 flex-shrink-0 aspect-video rounded-none" />
            <div className="flex-1 p-4 space-y-2">
                <Skeleton className="h-4 w-16 rounded-sm" />
                <Skeleton className="h-5 w-3/4 rounded-sm" />
                <Skeleton className="h-3 w-1/2 rounded-sm" />
            </div>
        </div>
    )
}

const TAB_LABELS: Record<FilterType, string> = {
    'all':        'All',
    'gfx-videos': 'GFX & Videos',
    'clips':      'Clips',
}

export default function MediaFeedPage() {
    const { posts, isLoading } = useAllMediaPosts()
    const [filter, setFilter] = useState<FilterType>('all')
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [gfxPost, setGfxPost] = useState<MediaPost | null>(null)

    const gfxVideoPosts = posts.filter(p => p.type !== 'clip')
    const clipPosts     = posts.filter(p => p.type === 'clip')

    return (
        <div className="page-wide py-6 space-y-6">
            <PublicPageHeader
                icon={ImageIcon}
                title="Media"
                subtitle="GFX, highlights, and league content"
            />

            {/* Tab bar */}
            <div className="flex gap-1.5">
                {(Object.keys(TAB_LABELS) as FilterType[]).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            'rounded-sm px-3 py-1 text-xs font-medium transition-colors',
                            filter === f
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                    >
                        {TAB_LABELS[f]}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <PostRowSkeleton key={i} />)}
                </div>
            ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No media posts yet.</p>
                </div>
            ) : filter === 'all' ? (
                // Desktop: flex-[2] GFX·Video column + flex-[1] Clips column
                // Mobile: stacked, GFX·Video rows first then clips section below
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {gfxVideoPosts.length > 0 && (
                        <div className="flex-[2] space-y-3">
                            {gfxVideoPosts.map(post => (
                                <PostRow key={post.id} post={post} onVideoClick={setVideoUrl} onGfxClick={setGfxPost} />
                            ))}
                        </div>
                    )}
                    {clipPosts.length > 0 && (
                        <div className="flex-[1] bg-muted/30 border border-border rounded-md p-3 space-y-3">
                            {clipPosts.map(post => (
                                <ClipCard key={post.id} post={post} padX="px-4 lg:px-6" />
                            ))}
                        </div>
                    )}
                    {gfxVideoPosts.length === 0 && clipPosts.length === 0 && (
                        <p className="text-sm text-muted-foreground">No posts yet.</p>
                    )}
                </div>
            ) : filter === 'gfx-videos' ? (
                gfxVideoPosts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No GFX or video posts yet.</p>
                ) : (
                    <div className="space-y-3">
                        {gfxVideoPosts.map(post => (
                            <PostRow key={post.id} post={post} onVideoClick={setVideoUrl} onGfxClick={setGfxPost} />
                        ))}
                    </div>
                )
            ) : (
                // Clips tab — 3-column portrait grid, pure 9:16 cells
                clipPosts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No clips yet.</p>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        {clipPosts.map(post => (
                            <ClipCard key={post.id} post={post} compact />
                        ))}
                    </div>
                )
            )}

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
        </div>
    )
}
