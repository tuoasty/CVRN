"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Play } from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'
import { Skeleton } from '@/app/components/ui/skeleton'
import { useAllMediaPosts } from '@/app/hooks/useMediaPosts'
import VideoEmbedDialog from '@/app/features/media/VideoEmbedDialog'
import { cn } from '@/lib/utils'
import type { MediaPost } from '@/server/domains/media'

const TYPE_COLORS: Record<string, string> = {
    gfx:   'bg-violet-500/20 text-violet-400 border-violet-500/30',
    video: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    news:  'bg-green-500/20 text-green-400 border-green-500/30',
    recap: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

type FilterType = 'all' | 'videos'

function PostCard({ post, onVideoClick }: { post: MediaPost; onVideoClick: (url: string) => void }) {
    const isVideo = post.type === 'video'

    function handleClick() {
        if (isVideo && post.video_url) onVideoClick(post.video_url)
    }

    return (
        <div
            className={cn(
                'panel overflow-hidden transition-colors hover:border-primary/30',
                isVideo && post.video_url ? 'cursor-pointer' : ''
            )}
            onClick={handleClick}
        >
            <div className="relative aspect-[4/3] bg-muted">
                {post.image_url ? (
                    <Image
                        src={post.image_url}
                        alt={post.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                )}
                {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                            <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                        </div>
                    </div>
                )}
                <Badge
                    variant="outline"
                    className={cn(
                        'absolute top-2 left-2 rounded-sm text-[10px] uppercase tracking-wide font-semibold backdrop-blur-sm',
                        TYPE_COLORS[post.type] ?? ''
                    )}
                >
                    {post.type}
                </Badge>
                {post.match_id && (
                    <Badge
                        variant="outline"
                        className="absolute top-2 right-2 rounded-sm text-[9px] uppercase tracking-wide bg-black/40 text-white border-white/20 backdrop-blur-sm"
                    >
                        Match
                    </Badge>
                )}
            </div>
            <div className="p-3 space-y-0.5">
                <p className="text-sm font-semibold truncate">{post.title}</p>
                <p className="text-[10px] text-muted-foreground">
                    {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
            </div>
        </div>
    )
}

function PostCardSkeleton() {
    return (
        <div className="panel overflow-hidden">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="p-3 space-y-1.5">
                <Skeleton className="h-4 w-3/4 rounded-sm" />
                <Skeleton className="h-2.5 w-1/3 rounded-sm" />
            </div>
        </div>
    )
}

export default function MediaFeedPage() {
    const { posts, isLoading } = useAllMediaPosts()
    const [filter, setFilter] = useState<FilterType>('all')
    const [videoUrl, setVideoUrl] = useState<string | null>(null)

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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => <PostCardSkeleton key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                        {posts.length === 0 ? 'No media posts yet.' : 'No match videos yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map(post => (
                        <PostCard key={post.id} post={post} onVideoClick={setVideoUrl} />
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
        </main>
    )
}
