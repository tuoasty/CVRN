"use client"

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { createArticleAction } from '@/app/actions/article.actions'
import { mutateArticles } from '@/app/hooks/useArticles'
import { mutateAllMedia } from '@/app/hooks/useMediaPosts'
import { toast } from '@/app/utils/toast'
import { clientLogger } from '@/app/utils/clientLogger'
import { compressImage } from '@/app/utils/imageCompression'
import { useAdminContextStore } from '@/app/stores/adminContextStore'
import { cn } from '@/lib/utils'
import AuthorPicker, { type AuthorSelection } from '@/app/features/media/AuthorPicker'
import MatchPicker, { type MatchSelection } from '@/app/features/articles/MatchPicker'
import SeasonSelect from '@/app/features/articles/SeasonSelect'

interface CreateArticleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function CreateArticleDialog({ open, onOpenChange }: CreateArticleDialogProps) {
    const adminSeasonId = useAdminContextStore(s => s.selectedSeasonId)

    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [seasonId, setSeasonId] = useState<string | null>(null)
    const [author, setAuthor] = useState<AuthorSelection | null>(null)
    const [match, setMatch] = useState<MatchSelection | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [compressing, setCompressing] = useState(false)
    const [publish, setPublish] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) setSeasonId(adminSeasonId)
    }, [open, adminSeasonId])

    function reset() {
        setTitle('')
        setBody('')
        setAuthor(null)
        setMatch(null)
        setImageFile(null)
        setPreview(null)
        setIsDragging(false)
        setCompressing(false)
        setPublish(false)
        setLoading(false)
    }

    function handleOpenChange(val: boolean) {
        if (!val) reset()
        onOpenChange(val)
    }

    async function acceptFile(file: File) {
        if (!file.type.startsWith('image/')) return
        setCompressing(true)
        try {
            const compressed = await compressImage(file, { maxDimension: 1920 })
            setImageFile(compressed)
            setPreview(URL.createObjectURL(compressed))
        } catch (err) {
            clientLogger.error('CreateArticleDialog', 'Image compression failed', { err })
            toast.error('Failed to process image')
        } finally {
            setCompressing(false)
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) acceptFile(file)
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) acceptFile(file)
    }

    function handlePaste(e: React.ClipboardEvent) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
            if (e.clipboardData.items[i].type.startsWith('image/')) {
                const file = e.clipboardData.items[i].getAsFile()
                if (file) { acceptFile(file); break }
            }
        }
    }

    function handleMatchChange(m: MatchSelection | null) {
        setMatch(m)
    }

    async function handleSubmit() {
        if (!title.trim()) { toast.error('Title is required'); return }
        if (!body.trim()) { toast.error('Body is required'); return }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.set('title', title.trim())
            formData.set('body', body)
            if (author) formData.set('authorId', author.id)
            if (match) formData.set('matchId', match.id)
            if (seasonId) formData.set('seasonId', seasonId)
            if (imageFile) formData.set('imageFile', imageFile)
            formData.set('published', publish ? 'true' : 'false')

            const result = await createArticleAction(formData)
            if (!result.ok) {
                toast.error(result.error.message)
                return
            }
            toast.success(publish ? 'Article published' : 'Draft saved')
            await Promise.all([mutateArticles(), mutateAllMedia()])
            handleOpenChange(false)
        } catch (err) {
            clientLogger.error('CreateArticleDialog', 'Unexpected error', { err })
            toast.error('Unexpected error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-none sm:max-w-none w-[97vw] h-[94vh] flex flex-col p-0 gap-0 rounded-sm overflow-hidden">
                <DialogHeader className="px-6 py-4 pr-14 border-b border-border flex-row items-center justify-between space-y-0 gap-4">
                    <DialogTitle>New Article</DialogTitle>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Season</Label>
                        <SeasonSelect value={seasonId} onChange={setSeasonId} />
                    </div>
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0">
                    <div className="grid lg:grid-cols-[1fr_380px] flex-1 min-h-0">
                        <div className="flex flex-col min-h-0 p-6 gap-4 border-r border-border">
                            <div className="space-y-1">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="rounded-sm text-lg" />
                            </div>
                            <div className="flex flex-col flex-1 min-h-0 space-y-1">
                                <Label htmlFor="body">Body <span className="text-muted-foreground text-xs">(Discord markdown)</span></Label>
                                <textarea
                                    id="body"
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    onPaste={handlePaste}
                                    className="flex-1 min-h-0 w-full resize-none rounded-sm border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    placeholder="Paste the article body here. **bold**, *italic*, # headers, > quotes, lists, `code`."
                                />
                            </div>
                        </div>

                        <div className="flex flex-col min-h-0 overflow-y-auto p-6 gap-5">
                            <AuthorPicker value={author} onChange={setAuthor} />
                            <MatchPicker seasonId={seasonId} value={match} onChange={handleMatchChange} />

                            <div className="space-y-1">
                                <Label>Cover image <span className="text-muted-foreground text-xs">(optional — shows in the media feed)</span></Label>
                                <div
                                    className={cn(
                                        'border-2 border-dashed rounded-sm p-4 text-center transition-colors',
                                        isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25',
                                    )}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                                    onDrop={handleDrop}
                                    onPaste={handlePaste}
                                    tabIndex={0}
                                >
                                    {preview ? (
                                        <div className="space-y-3">
                                            <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-sm object-contain" />
                                            <Button type="button" variant="outline" size="sm" className="rounded-sm" onClick={() => { setImageFile(null); setPreview(null) }}>
                                                Remove
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-sm text-muted-foreground">{compressing ? 'Processing image...' : 'Drag & drop, paste, or click to upload'}</p>
                                            <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileChange} className="rounded-sm" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-6 py-3 border-t border-border">
                        <div className="inline-flex rounded-sm border border-border overflow-hidden">
                            <button type="button" onClick={() => setPublish(false)}
                                className={cn('px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors',
                                    !publish ? 'bg-muted text-foreground' : 'bg-transparent text-muted-foreground')}>
                                Draft
                            </button>
                            <button type="button" onClick={() => setPublish(true)}
                                className={cn('px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors',
                                    publish ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground')}>
                                Publish
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" className="rounded-sm" onClick={() => handleOpenChange(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleSubmit} size="sm" className="rounded-sm" disabled={loading || compressing}>
                                {loading ? 'Saving...' : publish ? 'Publish' : 'Save Draft'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
