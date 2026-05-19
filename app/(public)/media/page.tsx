"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Play } from 'lucide-react'
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
}

type FilterType = 'all' | 'videos'

function PostRow({ post, onVideoClick, onGfxClick }: { post: MediaPost; onVideoClick: (url: string) => void; onGfxClick: (post: MediaPost) => void }) {
    const isVideo = post.type === 'video'
    const isGfx = post.type === 'gfx'
    const thumbnail = resolveMediaThumbnail(post.image_url, post.video_url)

    function handleClick() {
        if (isVideo && post.video_url) onVideoClick(post.video_url)
        else if (isGfx && post.image_url) onGfxClick(post)
    }

    return (
        <div
            className={cn(
                'panel flex gap-0 overflow-hidden transition-colors hover:border-primary/30',
                (isVideo && post.video_url) || (isGfx && post.image_url) ? 'cursor-pointer' : ''
            )}
            onClick={handleClick}
        >
            {/* Thumbnail */}
            <div className="relative w-48 sm:w-64 flex-shrink-0 aspect-video bg-muted self-stretch">
                {thumbnail ? (
                    <Image
                        src={thumbnail}
                        alt={post.title}
                        fill
                        sizes="(max-width: 640px) 192px, 256px"
                        className="object-cover"
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
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 p-4 flex flex-col justify-between gap-2">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                            variant="outline"
                            className={cn(
                                'rounded-sm text-[10px] uppercase tracking-wide font-semibold',
                                TYPE_COLORS[post.type] ?? ''
                            )}
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

export default function MediaFeedPage() {
    const { posts, isLoading } = useAllMediaPosts()
    const [filter, setFilter] = useState<FilterType>('all')
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [gfxPost, setGfxPost] = useState<MediaPost | null>(null)

    const filtered = filter === 'all' ? posts : posts.filter(p => p.type === 'video')

    return (
        <main className="page-narrow py-8 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                    <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Media
                    </h1>
                    <p className="text-xs text-muted-foreground">GFX, highlights, and league content</p>
                </div>
            </div>

            <div className="flex gap-1.5">
                {(['all', 'videos'] as FilterType[]).map(f => (
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
                        {f === 'all' ? 'All' : 'Match Videos'}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <PostRowSkeleton key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                        {posts.length === 0 ? 'No media posts yet.' : 'No match videos yet.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(post => (
                        <PostRow key={post.id} post={post} onVideoClick={setVideoUrl} onGfxClick={setGfxPost} />
                    ))}
                </div>
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
        </main>
    )
}
