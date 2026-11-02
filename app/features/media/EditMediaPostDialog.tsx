"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { updateMediaPostAction } from '@/app/actions/media.actions'
import { mutateAllMedia } from '@/app/hooks/useMediaPosts'
import { usePlayersByIds } from '@/app/hooks/usePlayers'
import { toast } from '@/app/utils/toast'
import { clientLogger } from '@/app/utils/clientLogger'
import AuthorPicker, { type AuthorSelection } from '@/app/features/media/AuthorPicker'
import type { MediaPost } from '@/server/domains/media'

interface EditMediaPostDialogProps {
    post: MediaPost | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSaved?: () => void
}

export default function EditMediaPostDialog({ post, open, onOpenChange, onSaved }: EditMediaPostDialogProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [author, setAuthor] = useState<AuthorSelection | null>(null)
    const [loading, setLoading] = useState(false)
    const authorInitedFor = useRef<string | null>(null)

    const { players } = usePlayersByIds(post?.author_id ? [post.author_id] : [])

    useEffect(() => {
        if (!post) return
        setTitle(post.title)
        setDescription(post.description ?? '')
        setAuthor(null)
        authorInitedFor.current = null
    }, [post])

    useEffect(() => {
        if (!post) return
        if (authorInitedFor.current === post.id) return
        if (!post.author_id) { authorInitedFor.current = post.id; return }
        const p = players.find(pl => pl.id === post.author_id)
        if (p) {
            setAuthor({ id: p.id, label: p.display_name || p.username || 'Unknown', avatarUrl: p.avatar_url })
            authorInitedFor.current = post.id
        }
    }, [players, post])

    function handleAuthorChange(v: AuthorSelection | null) {
        if (post) authorInitedFor.current = post.id
        setAuthor(v)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!post) return
        if (!title.trim()) { toast.error('Title is required'); return }

        setLoading(true)
        try {
            const result = await updateMediaPostAction({
                postId: post.id,
                title: title.trim(),
                description: description.trim() || null,
                authorId: author?.id ?? null,
            })
            if (!result.ok) { toast.error(result.error.message); return }
            toast.success('Post updated')
            await mutateAllMedia()
            onSaved?.()
            onOpenChange(false)
        } catch (err) {
            clientLogger.error('EditMediaPostDialog', 'Unexpected error', { err })
            toast.error('Unexpected error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Media Post</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="edit-title">Title</Label>
                        <Input id="edit-title" value={title} onChange={e => setTitle(e.target.value)} className="rounded-sm" />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="edit-description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Input id="edit-description" value={description} onChange={e => setDescription(e.target.value)} className="rounded-sm" />
                    </div>

                    <AuthorPicker value={author} onChange={handleAuthorChange} />

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" className="rounded-sm" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" className="rounded-sm" disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
