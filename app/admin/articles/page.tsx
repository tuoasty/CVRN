"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Newspaper, Trash2, Plus, Pencil, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { useAdminArticles, mutateArticles } from '@/app/hooks/useArticles'
import { mutateAllMedia } from '@/app/hooks/useMediaPosts'
import { deleteArticleAction, setArticlePublishedAction } from '@/app/actions/article.actions'
import CreateArticleDialog from '@/app/features/articles/CreateArticleDialog'
import EditArticleDialog from '@/app/features/articles/EditArticleDialog'
import type { ArticleListItem } from '@/server/domains/article'
import { toast } from '@/app/utils/toast'
import { cn } from '@/lib/utils'
import { useHasGroup } from '@/app/admin/AdminRoleProvider'

type FilterType = 'all' | 'published' | 'draft'
const FILTER_OPTIONS: FilterType[] = ['all', 'published', 'draft']

export default function AdminArticlesPage() {
    const { articles, isLoading } = useAdminArticles()
    const canPublish = useHasGroup('admin')
    const canDelete = useHasGroup('super_admin')
    const [createOpen, setCreateOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<ArticleListItem | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<ArticleListItem | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [publishing, setPublishing] = useState<string | null>(null)
    const [filter, setFilter] = useState<FilterType>('all')

    const filtered = articles.filter(a =>
        filter === 'all' ? true : filter === 'published' ? !!a.published_at : !a.published_at
    )

    async function handleTogglePublish(a: ArticleListItem) {
        setPublishing(a.id)
        try {
            const result = await setArticlePublishedAction({ articleId: a.id, published: !a.published_at })
            if (!result.ok) { toast.error(result.error.message); return }
            toast.success(a.published_at ? 'Unpublished' : 'Published')
            await Promise.all([mutateArticles(), mutateAllMedia()])
        } finally {
            setPublishing(null)
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return
        setDeleting(deleteTarget.id)
        try {
            const result = await deleteArticleAction({ articleId: deleteTarget.id })
            if (!result.ok) { toast.error(result.error.message); return }
            toast.success('Article deleted')
            await Promise.all([mutateArticles(), mutateAllMedia()])
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
                        <Newspaper className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">Articles</h1>
                        <p className="text-sm text-muted-foreground mt-1">News and long-form posts</p>
                    </div>
                    <Button size="sm" className="rounded-sm gap-1" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" /> New Article
                    </Button>
                </div>

                <div className="flex gap-1.5 flex-wrap mt-4">
                    {FILTER_OPTIONS.map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={cn(
                                'rounded-sm px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors',
                                filter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                        {articles.length === 0 ? 'No articles yet.' : `No ${filter} articles.`}
                    </p>
                ) : (
                    <div className="mt-4 space-y-2">
                        {filtered.map(a => (
                            <div key={a.id} className={cn(
                                'flex items-center gap-3 p-3 rounded-sm border transition-colors',
                                a.published_at ? 'border-border bg-card hover:bg-muted/30' : 'border-secondary/20 bg-secondary/5 hover:bg-secondary/10',
                            )}>
                                {a.thumbnail_url ? (
                                    <div className="relative w-12 h-12 flex-shrink-0 rounded-sm border border-border overflow-hidden">
                                        <Image src={a.thumbnail_url} alt={a.title} fill sizes="48px" className="object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 flex-shrink-0 rounded-sm border border-border bg-muted flex items-center justify-center">
                                        <Newspaper className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{a.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {a.author ? (a.author.display_name || a.author.username) : 'No author'}
                                        {' · '}
                                        {new Date(a.published_at ?? a.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <Badge variant="outline" className={cn('rounded-sm text-xs uppercase',
                                    a.published_at ? 'text-muted-foreground' : 'text-secondary border-secondary/40')}>
                                    {a.published_at ? 'Published' : 'Draft'}
                                </Badge>
                                {(canPublish || a.published_at) && <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-sm text-muted-foreground hover:bg-muted"
                                    disabled={publishing === a.id}
                                    onClick={() => handleTogglePublish(a)}
                                    title={a.published_at ? 'Unpublish' : 'Publish'}
                                >
                                    {a.published_at ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-sm text-muted-foreground hover:bg-muted"
                                    onClick={() => setEditTarget(a)}
                                    title="Edit"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                {canDelete && <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-sm text-destructive hover:bg-destructive/10"
                                    disabled={deleting === a.id}
                                    onClick={() => setDeleteTarget(a)}
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete article?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{deleteTarget?.title}&rdquo; and its cover post will be permanently deleted. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="rounded-sm bg-destructive hover:bg-destructive/90" onClick={confirmDelete} disabled={!!deleting}>
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <CreateArticleDialog open={createOpen} onOpenChange={setCreateOpen} />
            <EditArticleDialog article={editTarget} open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)} />
        </div>
    )
}
