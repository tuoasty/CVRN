"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Image as ImageIcon, Play, Pin, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader"
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import VideoEmbedDialog from '@/app/features/media/VideoEmbedDialog'
import GFXImageDialog from '@/app/features/media/GFXImageDialog'
import { resolveMediaThumbnail } from '@/app/features/media/mediaUtils'
import ArticleList from '@/app/(public)/articles/ArticleList'
import { buildArticleHref } from '@/app/utils/matchDetailHref'
import { usePlayersByIds } from '@/app/hooks/usePlayers'
import { cn } from '@/lib/utils'
import type { MediaFilterType, MediaPost } from '@/server/domains/media'
import type { ArticleListItem } from '@/server/domains/article'

type TabKey = MediaFilterType | 'articles'

const TAB_LABELS: Record<TabKey, string> = {
    all:      'All',
    articles: 'Articles',
    videos:   'Videos',
    features: 'Features',
    gfx:      'GFX',
    clips:    'Clips',
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

function MediaCard({ post, authorName, onVideoClick, onGfxClick }: {
    post: MediaPost
    authorName?: string | null
    onVideoClick: (url: string) => void
    onGfxClick: (post: MediaPost) => void
}) {
    const isVideo = post.type === 'video' || post.type === 'feature' || post.type === 'recap'
    const isImage = post.type === 'gfx' || post.type === 'totw' || post.type === 'potw'
    const thumbnail = resolveMediaThumbnail(post.image_url, post.video_url)

    function handleClick() {
        if (isVideo && post.video_url) onVideoClick(post.video_url)
        else if (isImage && post.image_url) onGfxClick(post)
    }

    const isClickable = (isVideo && !!post.video_url) || (isImage && !!post.image_url)

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
                    className="rounded-full border-border bg-transparent px-2 py-0.5 text-xs font-medium uppercase text-muted-foreground"
                >
                    {post.type}
                </Badge>
                <p className="text-sm font-semibold leading-snug line-clamp-2">{post.title}</p>
                {post.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{post.description}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-muted-foreground/60">
                        {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {authorName && (
                        <p className="text-[10px] text-muted-foreground/60 truncate">by {authorName}</p>
                    )}
                </div>
            </div>
        </div>
    )
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

const FILTER_TYPES: Record<MediaFilterType, MediaPost['type'][]> = {
    all:      ['gfx', 'video', 'feature', 'news', 'recap', 'totw', 'potw'],
    videos:   ['video'],
    features: ['feature'],
    gfx:      ['gfx', 'totw', 'potw'],
    clips:    ['clip'],
}

const PAGE_SIZE = 12
const CLIPS_PAGE_SIZE = 9

function matchesSearch(post: MediaPost, q: string): boolean {
    if (!q) return true
    const needle = q.toLowerCase()
    return (
        post.title.toLowerCase().includes(needle) ||
        (post.description?.toLowerCase().includes(needle) ?? false)
    )
}

type Props = {

    posts: MediaPost[]
    articles?: ArticleListItem[]
}

export default function MediaFeedPage({ posts: allPosts, articles: allArticles = [] }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const tabParam = searchParams.get('tab')
    const filter: TabKey = tabParam && tabParam in TAB_LABELS ? (tabParam as TabKey) : 'all'
    const [page, setPage]         = useState(1)
    const [clipsPage, setClipsPage] = useState(1)
    const [search, setSearch]     = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    const [clipsEverVisited, setClipsEverVisited] = useState(false)

    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [gfxPost, setGfxPost]   = useState<MediaPost | null>(null)

    const authorIds = useMemo(
        () => Array.from(new Set(allPosts.map(p => p.author_id).filter((id): id is string => !!id))),
        [allPosts]
    )
    const { players: authorPlayers } = usePlayersByIds(authorIds)
    const authorNameById = useMemo(
        () => new Map(authorPlayers.map(p => [p.id, p.display_name || p.username])),
        [authorPlayers]
    )

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => { setPage(1) }, [filter, debouncedSearch])

    useEffect(() => {
        if (filter === 'clips' && !clipsEverVisited) setClipsEverVisited(true)
    }, [filter, clipsEverVisited])

    const isOnClips = filter === 'clips'
    const isOnArticles = filter === 'articles'

    const articlesById = useMemo(() => {
        const map = new Map<string, ArticleListItem>()
        for (const a of allArticles) map.set(a.id, a)
        return map
    }, [allArticles])

    const { posts, totalPages } = useMemo(() => {
        const types = FILTER_TYPES[isOnClips || isOnArticles ? 'all' : (filter as MediaFilterType)]
        const matched = allPosts.filter(
            p => types.includes(p.type) && matchesSearch(p, debouncedSearch),
        )
        const from = (page - 1) * PAGE_SIZE
        return {
            posts: matched.slice(from, from + PAGE_SIZE),
            totalPages: Math.ceil(matched.length / PAGE_SIZE),
        }
    }, [allPosts, filter, isOnClips, isOnArticles, debouncedSearch, page])

    const { articleItems, articlesTotalPages } = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase()
        const matched = allArticles.filter(a =>
            !q || a.title.toLowerCase().includes(q) || a.snippet.toLowerCase().includes(q)
        )
        const from = (page - 1) * PAGE_SIZE
        return {
            articleItems: matched.slice(from, from + PAGE_SIZE),
            articlesTotalPages: Math.ceil(matched.length / PAGE_SIZE),
        }
    }, [allArticles, debouncedSearch, page])

    const { clipsPosts, clipsTotalPages } = useMemo(() => {
        const matched = allPosts.filter(p => FILTER_TYPES.clips.includes(p.type))
        const from = (clipsPage - 1) * CLIPS_PAGE_SIZE
        return {
            clipsPosts: matched.slice(from, from + CLIPS_PAGE_SIZE),
            clipsTotalPages: Math.ceil(matched.length / CLIPS_PAGE_SIZE),
        }
    }, [allPosts, clipsPage])

    const handleFilter = useCallback((f: TabKey) => {
        const params = new URLSearchParams(searchParams.toString())
        if (f === 'all') params.delete('tab')
        else params.set('tab', f)
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, [router, pathname, searchParams])

    return (
        <div className="page-wide py-6 space-y-6">
            <PublicPageHeader
                title="Media"
                subtitle="GFX, highlights, and league content"
            />

            {}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex flex-wrap gap-x-5">
                    {(Object.keys(TAB_LABELS) as TabKey[]).map(f => (
                        <button
                            key={f}
                            type="button"
                            aria-pressed={filter === f}
                            onClick={() => handleFilter(f)}
                            className={cn(
                                'h-9 text-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                                filter === f
                                    ? 'font-semibold text-foreground underline decoration-2 underline-offset-[6px]'
                                    : 'font-medium text-muted-foreground hover:text-foreground'
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

            {}
            {clipsEverVisited && (
                <div className={isOnClips ? undefined : 'hidden'}>
                    {clipsPosts.length === 0 ? (
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

            {}
            {isOnArticles && (
                articleItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">
                            {debouncedSearch ? 'No results found.' : 'No articles yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <ArticleList articles={articleItems} columns={2} />
                        <Pagination page={page} totalPages={articlesTotalPages} onPage={setPage} />
                    </div>
                )
            )}

            {}
            {!isOnClips && !isOnArticles && (
                posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">
                            {debouncedSearch ? 'No results found.' : 'No posts yet.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {posts.map(post => {
                                const article = post.type === 'news' && post.article_id ? articlesById.get(post.article_id) : null
                                const authorName = post.author_id ? authorNameById.get(post.author_id) ?? null : null
                                return article ? (
                                    <Link key={post.id} href={buildArticleHref(article)}>
                                        <MediaCard post={post} authorName={authorName} onVideoClick={setVideoUrl} onGfxClick={setGfxPost} />
                                    </Link>
                                ) : (
                                    <MediaCard key={post.id} post={post} authorName={authorName} onVideoClick={setVideoUrl} onGfxClick={setGfxPost} />
                                )
                            })}
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
