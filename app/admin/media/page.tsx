"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Trash2, Plus, Pin, Pencil } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { useAllMediaPosts, mutateAllMedia } from '@/app/hooks/useMediaPosts'
import { deleteMediaPostAction, togglePinMediaPostAction } from '@/app/actions/media.actions'
import { errorCodeToUserMessage } from '@/app/lib/errorMessages'
import CreateMediaPostDialog from '@/app/features/media/CreateMediaPostDialog'
import EditMediaPostDialog from '@/app/features/media/EditMediaPostDialog'
import type { MediaPost } from '@/server/domains/media'
import { toast } from '@/app/utils/toast'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'gfx' | 'video' | 'news' | 'recap' | 'clip' | 'totw' | 'potw'
const FILTER_OPTIONS: FilterType[] = ['all', 'gfx', 'video', 'clip', 'totw', 'potw', 'news', 'recap']

export default function AdminMediaPage() {
    const { posts, isLoading } = useAllMediaPosts()
    const [createOpen, setCreateOpen] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [pinning, setPinning] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
    const [editTarget, setEditTarget] = useState<MediaPost | null>(null)
    const [filterType, setFilterType] = useState<FilterType>('all')

    const filtered = filterType === 'all' ? posts : posts.filter(p => p.type === filterType)

    async function handleTogglePin(id: string) {
        setPinning(id)
        try {
            const result = await togglePinMediaPostAction({ postId: id })
            if (!result.ok) { toast.error(errorCodeToUserMessage(result.error.code)); return }
            await mutateAllMedia()
        } finally {
            setPinning(null)
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return
        setDeleting(deleteTarget.id)
        try {
            const result = await deleteMediaPostAction({ postId: deleteTarget.id })
            if (!result.ok) { toast.error(result.error.message); return }
            toast.success('Post deleted')
            await mutateAllMedia()
        } finally {
            setDeleting(null)
            setDeleteTarget(null)
        }
    }

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <ImageIcon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">
                            Media
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">GFX, video embeds, and announcements</p>
                    </div>
                    <Button size="sm" className="rounded-sm gap-1" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" /> New Post
                    </Button>
                </div>

                <div className="flex gap-1.5 flex-wrap mt-4">
                    {FILTER_OPTIONS.map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={cn(
                                'rounded-sm px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors',
                                filterType === t
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                        >
                            {t === 'all' ? 'All' : t}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                        {posts.length === 0 ? 'No media posts yet.' : `No ${filterType} posts.`}
                    </p>
                ) : (
                    <div className="mt-4 space-y-2">
                        {filtered.map(post => (
                            <div key={post.id} className={cn(
                                'flex items-center gap-3 p-3 rounded-sm border transition-colors',
                                post.is_pinned
                                    ? 'border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/15'
                                    : 'border-border bg-card hover:bg-muted/30',
                            )}>
                                {post.image_url && post.type !== 'clip' && (
                                    <div className="relative w-12 h-12 flex-shrink-0 rounded-sm border border-border overflow-hidden">
                                        <Image src={post.image_url} alt={post.title} fill sizes="48px" className="object-cover" />
                                    </div>
                                )}
                                {post.type === 'clip' && (
                                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm flex-shrink-0">
                                        ID: {post.video_url ?? '—'}
                                    </span>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{post.title}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(post.published_at).toLocaleDateString()}</p>
                                </div>
                                <Badge variant="outline" className="rounded-sm text-xs uppercase text-muted-foreground">
                                    {post.type}
                                </Badge>
                                {post.video_url && post.type !== 'clip' && (
                                    <a href={post.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                                        Link
                                    </a>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn('h-8 w-8 rounded-sm', post.is_pinned ? 'text-blue-400 hover:bg-blue-500/10' : 'text-muted-foreground hover:bg-muted')}
                                    disabled={pinning === post.id}
                                    onClick={() => handleTogglePin(post.id)}
                                    title={post.is_pinned ? 'Unpin post' : 'Pin post'}
                                >
                                    <Pin className={cn('h-4 w-4', post.is_pinned && 'fill-blue-400')} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-sm text-muted-foreground hover:bg-muted"
                                    onClick={() => setEditTarget(post)}
                                    title="Edit post"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-sm text-destructive hover:bg-destructive/10"
                                    disabled={deleting === post.id}
                                    onClick={() => setDeleteTarget({ id: post.id, title: post.title })}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete post?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-sm bg-destructive hover:bg-destructive/90"
                            onClick={confirmDelete}
                            disabled={!!deleting}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <CreateMediaPostDialog open={createOpen} onOpenChange={setCreateOpen} />

            <EditMediaPostDialog post={editTarget} open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)} />
        </div>
    )
}
