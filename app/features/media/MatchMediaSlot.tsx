"use client"

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { createMediaPostAction, deleteMediaPostAction } from '@/app/actions/media.actions'
import { assignMediaToMatch, mutateAllMedia, useAllMediaPosts } from '@/app/hooks/useMediaPosts'
import { errorCodeToUserMessage } from '@/app/lib/errorMessages'
import { resolveMediaThumbnail } from '@/app/features/media/mediaUtils'
import { toast } from '@/app/utils/toast'
import { clientLogger } from '@/app/utils/clientLogger'
import { compressImage } from '@/app/utils/imageCompression'
import AuthorPicker, { type AuthorSelection } from '@/app/features/media/AuthorPicker'
import ImageDropzone from '@/app/features/media/ImageDropzone'
import type { MatchMediaSlot as Slot, MediaPost } from '@/server/domains/media'

const SLOT_LABELS: Record<Slot, string> = { gfx: 'GFX', video: 'VOD' }

interface MatchMediaSlotProps {
    slot: Slot
    matchId: string
    current: MediaPost | null
    onChanged: () => void

    defaultTitle?: string
}

export default function MatchMediaSlotPanel({ slot, matchId, current, onChanged, defaultTitle }: MatchMediaSlotProps) {
    const label = SLOT_LABELS[slot]

    if (current) {
        return <FilledSlot label={label} post={current} onChanged={onChanged} />
    }
    return <EmptySlot slot={slot} label={label} matchId={matchId} onChanged={onChanged} defaultTitle={defaultTitle} />
}

function FilledSlot({ label, post, onChanged }: { label: string; post: MediaPost; onChanged: () => void }) {
    const [removing, setRemoving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const thumbnail = resolveMediaThumbnail(post.image_url, post.video_url)

    async function handleRemove() {
        setRemoving(true)
        try {
            const result = await assignMediaToMatch(post.id, null)
            if (!result.ok) { toast.error(errorCodeToUserMessage(result.error.code)); return }
            toast.success(`${label} removed`)
            onChanged()
        } finally {
            setRemoving(false)
        }
    }

    async function handleDelete() {
        setDeleting(true)
        try {
            const result = await deleteMediaPostAction({ postId: post.id })
            if (!result.ok) { toast.error(errorCodeToUserMessage(result.error.code)); return }
            toast.success(`${label} deleted`)
            await mutateAllMedia()
            setConfirmDelete(false)
            onChanged()
        } finally {
            setDeleting(false)
        }
    }

    const busy = removing || deleting

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex items-center gap-3 p-3 rounded-sm border border-border bg-card">
                {thumbnail && (
                    <div className="relative w-16 h-10 flex-shrink-0 rounded-sm border border-border overflow-hidden">
                        <Image src={thumbnail} alt={post.title} fill sizes="64px" unoptimized className="object-cover" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground">
                        {new Date(post.published_at).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="rounded-sm" disabled={busy} onClick={handleRemove}>
                        {removing ? 'Removing...' : 'Remove'}
                    </Button>
                    <Button variant="destructive" size="sm" className="rounded-sm" disabled={busy} onClick={() => setConfirmDelete(true)}>
                        Delete
                    </Button>
                </div>
            </div>
            <p className="text-xs text-muted-foreground">
                Remove unlinks the post but keeps it in the media feed. Delete removes the post and its image for good.
            </p>

            <AlertDialog open={confirmDelete} onOpenChange={open => !open && setConfirmDelete(false)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this {label}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently deletes the post and its uploaded image. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm" disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleting}
                            onClick={e => { e.preventDefault(); handleDelete() }}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function EmptySlot({ slot, label, matchId, onChanged, defaultTitle }: { slot: Slot; label: string; matchId: string; onChanged: () => void; defaultTitle?: string }) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Tabs defaultValue="new" className="space-y-3">
                <TabsList>
                    <TabsTrigger value="new">Upload new</TabsTrigger>
                    <TabsTrigger value="existing">Pick existing</TabsTrigger>
                </TabsList>
                <TabsContent value="new" className="mt-0">
                    <CreateForSlot slot={slot} label={label} matchId={matchId} onChanged={onChanged} defaultTitle={defaultTitle} />
                </TabsContent>
                <TabsContent value="existing" className="mt-0">
                    <PickExisting slot={slot} label={label} matchId={matchId} onChanged={onChanged} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function PickExisting({ slot, label, matchId, onChanged }: { slot: Slot; label: string; matchId: string; onChanged: () => void }) {
    const { posts, isLoading } = useAllMediaPosts()
    const [search, setSearch] = useState('')
    const [assigning, setAssigning] = useState<string | null>(null)

    const candidates = useMemo(() => {
        const q = search.trim().toLowerCase()
        return posts
            .filter(p => p.type === slot && p.match_id === null)
            .filter(p => !q || p.title.toLowerCase().includes(q))
    }, [posts, slot, search])

    async function handlePick(postId: string) {
        setAssigning(postId)
        try {
            const result = await assignMediaToMatch(postId, matchId)
            if (!result.ok) { toast.error(errorCodeToUserMessage(result.error.code)); return }
            toast.success(`${label} attached`)
            onChanged()
        } finally {
            setAssigning(null)
        }
    }

    return (
        <div className="space-y-2">
            <Input
                placeholder={`Search unlinked ${label} posts`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="rounded-sm"
            />
            <div className="max-h-56 overflow-y-auto space-y-1.5">
                {isLoading ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
                ) : candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No unlinked {label} posts.</p>
                ) : (
                    candidates.map(post => {
                        const thumbnail = resolveMediaThumbnail(post.image_url, post.video_url)
                        return (
                            <button
                                key={post.id}
                                type="button"
                                disabled={assigning !== null}
                                onClick={() => handlePick(post.id)}
                                className="w-full flex items-center gap-3 p-2 rounded-sm border border-border bg-card text-left hover:bg-muted/30 transition-colors disabled:opacity-50"
                            >
                                {thumbnail && (
                                    <div className="relative w-12 h-8 flex-shrink-0 rounded-sm border border-border overflow-hidden">
                                        <Image src={thumbnail} alt={post.title} fill sizes="48px" unoptimized className="object-cover" />
                                    </div>
                                )}
                                <span className="flex-1 min-w-0 text-sm truncate">{post.title}</span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {assigning === post.id ? 'Attaching...' : new Date(post.published_at).toLocaleDateString()}
                                </span>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}

function CreateForSlot({ slot, label, matchId, onChanged, defaultTitle }: { slot: Slot; label: string; matchId: string; onChanged: () => void; defaultTitle?: string }) {
    const [title, setTitle] = useState(defaultTitle ?? '')
    const [videoUrl, setVideoUrl] = useState('')
    const [author, setAuthor] = useState<AuthorSelection | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [compressing, setCompressing] = useState(false)
    const [loading, setLoading] = useState(false)

    async function acceptFile(file: File) {
        if (!file.type.startsWith('image/')) return
        setCompressing(true)
        try {
            const compressed = await compressImage(file, { maxDimension: 1920 })
            setImageFile(compressed)
            setPreview(URL.createObjectURL(compressed))
        } catch (err) {
            clientLogger.error('MatchMediaSlot', 'Image compression failed', { err })
            toast.error('Failed to process image')
        } finally {
            setCompressing(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!title.trim()) { toast.error('Title is required'); return }
        if (slot === 'gfx' && !imageFile) { toast.error('Image is required for GFX posts'); return }
        if (slot === 'video' && !videoUrl.trim()) { toast.error('URL is required'); return }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.set('type', slot)
            formData.set('title', title.trim())
            formData.set('matchId', matchId)
            if (slot === 'gfx' && imageFile) formData.set('imageFile', imageFile)
            if (slot === 'gfx' && author) formData.set('authorId', author.id)
            if (slot === 'video') formData.set('videoUrl', videoUrl.trim())

            const result = await createMediaPostAction(formData)
            if (!result.ok) { toast.error(result.error.message); return }
            toast.success(`${label} created`)
            await mutateAllMedia()
            onChanged()
        } catch (err) {
            clientLogger.error('MatchMediaSlot', 'Unexpected error', { err })
            toast.error('Unexpected error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
                <Label htmlFor={`${slot}-title`}>Title</Label>
                <Input id={`${slot}-title`} value={title} onChange={e => setTitle(e.target.value)} className="rounded-sm" />
            </div>

            {slot === 'gfx' ? (
                <ImageDropzone
                    preview={preview}
                    compressing={compressing}
                    onFile={acceptFile}
                    onClear={() => { setImageFile(null); setPreview(null) }}
                    clearLabel="Change"
                    previewMaxHeight="max-h-40"
                />
            ) : (
                <div className="space-y-1">
                    <Label htmlFor={`${slot}-url`}>YouTube / Twitch URL</Label>
                    <Input
                        id={`${slot}-url`}
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        value={videoUrl}
                        onChange={e => setVideoUrl(e.target.value)}
                        className="rounded-sm"
                    />
                </div>
            )}

            {slot === 'gfx' && (
                <AuthorPicker value={author} onChange={setAuthor} />
            )}

            <div className="flex justify-end">
                <Button type="submit" size="sm" className="rounded-sm" disabled={loading || compressing}>
                    {loading ? 'Creating...' : `Create ${label}`}
                </Button>
            </div>
        </form>
    )
}
