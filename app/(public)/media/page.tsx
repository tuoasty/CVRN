"use client"

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Play, Pin, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader"
import { Badge } from '@/app/components/ui/badge'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Button } from '@/app/components/ui/button'
import { usePagedMediaPosts } from '@/app/hooks/useMediaPosts'
import VideoEmbedDialog from '@/app/features/media/VideoEmbedDialog'
import GFXImageDialog from '@/app/features/media/GFXImageDialog'
import { resolveMediaThumbnail } from '@/app/features/media/mediaUtils'
import { cn } from '@/lib/utils'
import type { MediaFilterType, MediaPost } from '@/server/domains/media'

const TYPE_COLORS: Record<string, string> = {
    gfx:   'bg-violet-500/20 text-violet-400 border-violet-500/30',
    video: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    news:  'bg-green-500/20 text-green-400 border-green-500/30',
    recap: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    clip:  'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

const TAB_LABELS: Record<MediaFilterType, string> = {
    all:    'All',
    videos: 'Videos',
    gfx:    'GFX',
    clips:  'Clips',
}

function ClipCard({ post, compact = false }: { post: MediaPost; compact?: boolean }) {
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
            <div className="px-4 lg:px-6">
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

function MediaCard({ post, onVideoClick, onGfxClick }: {
    post: MediaPost
    onVideoClick: (url: string) => void
    onGfxClick: (post: MediaPost) => void
}) {
    const isVideo = post.type === 'video' || post.type === 'recap'
    const thumbnail = resolveMediaThumbnail(post.image_url, post.video_url)

    function handleClick() {
        if (isVideo && post.video_url) onVideoClick(post.video_url)
        else if (post.type === 'gfx' && post.image_url) onGfxClick(post)
    }

    const isClickable = (isVideo && !!post.video_url) || (post.type === 'gfx' && !!post.image_url)

    return (
        <div
            className={cn(
                'panel overflow-hidden transition-colors hover:border-primary/30',
                isClickable ? 'cursor-pointer' : ''
            )}
            onClick={handleClick}
        >
            <div className="relative aspect-video bg-muted">
                {thumbnail ? (
                    <Image
                        src={thumbnail}
                        alt={post.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
                    <div className="absolute top-1.5 right-1.5">
                        <Pin className="h-3 w-3 text-white/70 fill-white/70" />
                    </div>
                )}
            </div>
            <div className="p-3 space-y-1">
                <Badge
                    variant="outline"
                    className={cn('rounded-sm text-[9px] uppercase tracking-wide font-semibold', TYPE_COLORS[post.type] ?? '')}
                >
                    {post.type}
                </Badge>
                <p className="text-sm font-semibold leading-snug line-clamp-2">{post.title}</p>
                {post.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{post.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground/60">
                    {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
            </div>
        </div>
    )
}

function CardSkeleton() {
    return (
        <div className="panel overflow-hidden">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="p-3 space-y-2">
                <Skeleton className="h-3 w-12 rounded-sm" />
                <Skeleton className="h-4 w-3/4 rounded-sm" />
                <Skeleton className="h-3 w-full rounded-sm" />
            </div>
        </div>
    )
}

function ClipSkeleton() {
    return <Skeleton className="w-full rounded-sm" style={{ aspectRatio: '9/16' }} />
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
    if (totalPages <= 1) return null
    return (
        <div className="flex items-center justify-center gap-3 pt-4">
            <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page <= 1}
                onClick={() => onPage(page - 1)}
            >
                <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
                Page {page} of {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page >= totalPages}
                onClick={() => onPage(page + 1)}
            >
                <ChevronRight className="h-3.5 w-3.5" />
            </Button>
        </div>
    )
}

export default function MediaFeedPage() {
    const [filter, setFilter] = useState<MediaFilterType>('all')
    const [page, setPage]         = useState(1)
    const [clipsPage, setClipsPage] = useState(1)
    const [search, setSearch]     = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    // Track first clips visit so we mount the iframes once and never unmount them
    const [clipsEverVisited, setClipsEverVisited] = useState(false)

    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [gfxPost, setGfxPost]   = useState<MediaPost | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => { setPage(1) }, [filter, debouncedSearch])

    useEffect(() => {
        if (filter === 'clips' && !clipsEverVisited) setClipsEverVisited(true)
    }, [filter, clipsEverVisited])

    const isOnClips = filter === 'clips'

    // Main feed — disabled while on clips tab to avoid a wasted fetch
    const { posts, totalPages, isLoading } = usePagedMediaPosts(
        isOnClips ? 'all' : filter,
        page,
        debouncedSearch,
        isOnClips,
    )

    // Clips feed — fetched lazily on first visit, never disabled after that
    const { posts: clipsPosts, totalPages: clipsTotalPages, isLoading: clipsLoading } = usePagedMediaPosts(
        'clips',
        clipsPage,
        '',
        !clipsEverVisited,
        9,
    )

    const handleFilter = useCallback((f: MediaFilterType) => {
        setFilter(f)
        setPage(1)
    }, [])

    return (
        <div className="page-wide py-6 space-y-6">
            <PublicPageHeader
                icon={ImageIcon}
                title="Media"
                subtitle="GFX, highlights, and league content"
            />

            {/* Controls row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex gap-1.5">
                    {(Object.keys(TAB_LABELS) as MediaFilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => handleFilter(f)}
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
                <div className={cn("relative sm:ml-auto w-full sm:w-56", filter === 'clips' && "hidden")}>
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-7 pl-8 pr-7 text-xs rounded-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Clips — always mounted after first visit, hidden via CSS when not active */}
            {clipsEverVisited && (
                <div className={isOnClips ? undefined : 'hidden'}>
                    {clipsLoading && clipsPosts.length === 0 ? (
                        <div className="grid grid-cols-3 gap-3">
                            {[...Array(6)].map((_, i) => <ClipSkeleton key={i} />)}
                        </div>
                    ) : clipsPosts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-3">
                            <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No clips yet.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-3">
                                {clipsPosts.map(post => <ClipCard key={post.id} post={post} compact />)}
                            </div>
                            <Pagination page={clipsPage} totalPages={clipsTotalPages} onPage={setClipsPage} />
                        </>
                    )}
                </div>
            )}

            {/* Main feed — card grid for all non-clip tabs */}
            {!isOnClips && (
                isLoading && posts.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">
                            {debouncedSearch ? 'No results found.' : 'No posts yet.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {posts.map(post => (
                                <MediaCard key={post.id} post={post} onVideoClick={setVideoUrl} onGfxClick={setGfxPost} />
                            ))}
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
                    </>
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
