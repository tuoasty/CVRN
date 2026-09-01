"use client"

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import ImageDropzone from '@/app/features/media/ImageDropzone'
import { Label } from '@/app/components/ui/label'
import { createArticleAction } from '@/app/actions/article.actions'
import { mutateArticles } from '@/app/hooks/useArticles'
import { mutateAllMedia } from '@/app/hooks/useMediaPosts'
import { toast } from '@/app/utils/toast'
import { clientLogger } from '@/app/utils/clientLogger'
import { compressImage } from '@/app/utils/imageCompression'
import { useAdminContextStore } from '@/app/stores/adminContextStore'
import { cn } from '@/lib/utils'
import { type AuthorSelection } from '@/app/features/media/AuthorPicker'
import { type MatchSelection } from '@/app/features/articles/MatchPicker'
import ArticleFormFields from '@/app/features/articles/ArticleFormFields'
import SlugFields from '@/app/features/articles/SlugFields'
import { useSlugField } from '@/app/features/articles/useSlugField'
import SeasonSelect from '@/app/features/articles/SeasonSelect'

interface CreateArticleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function CreateArticleDialog({ open, onOpenChange }: CreateArticleDialogProps) {
    const adminSeasonId = useAdminContextStore(s => s.selectedSeasonId)

    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const slugField = useSlugField()
    const [seasonId, setSeasonId] = useState<string | null>(null)
    const [author, setAuthor] = useState<AuthorSelection | null>(null)
    const [match, setMatch] = useState<MatchSelection | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [compressing, setCompressing] = useState(false)
    const [publish, setPublish] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) setSeasonId(adminSeasonId)
    }, [open, adminSeasonId])

    function reset() {
        setTitle('')
        setBody('')
        slugField.reset()
        setAuthor(null)
        setMatch(null)
        setImageFile(null)
        setPreview(null)
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
            if (slugField.slug.trim()) formData.set('slug', slugField.canonicalSlug)
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
                    <ArticleFormFields
                        idPrefix="create"
                        title={title}
                        onTitleChange={setTitle}
                        body={body}
                        onBodyChange={setBody}
                        onBodyPaste={handlePaste}
                        author={author}
                        onAuthorChange={setAuthor}
                        seasonId={seasonId}
                        match={match}
                        onMatchChange={handleMatchChange}
                        topSlot={
                            <SlugFields
                                idPrefix="create"
                                shortName={slugField.shortName}
                                slug={slugField.slug}
                                canonicalSlug={slugField.canonicalSlug}
                                onShortNameChange={slugField.setShortName}
                                onSlugChange={slugField.setSlug}
                            />
                        }
                        coverSlot={
                            <div className="space-y-1">
                                <Label>Cover image <span className="text-muted-foreground text-xs">(optional — shows in the media feed)</span></Label>
                                <ImageDropzone
                                    preview={preview}
                                    compressing={compressing}
                                    onFile={acceptFile}
                                    onClear={() => { setImageFile(null); setPreview(null) }}
                                />
                            </div>
                        }
                    />

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
