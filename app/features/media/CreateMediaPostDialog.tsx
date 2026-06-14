"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { createMediaPostAction } from '@/app/actions/media.actions'
import { mutateAllMedia } from '@/app/hooks/useMediaPosts'
import { toast } from '@/app/utils/toast'
import { clientLogger } from '@/app/utils/clientLogger'
import { compressImage } from '@/app/utils/imageCompression'

interface CreateMediaPostDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function CreateMediaPostDialog({ open, onOpenChange }: CreateMediaPostDialogProps) {
    const [type, setType] = useState<'gfx' | 'video' | 'clip'>('gfx')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [videoUrl, setVideoUrl] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [compressing, setCompressing] = useState(false)
    const [loading, setLoading] = useState(false)

    function reset() {
        setType('gfx')
        setTitle('')
        setDescription('')
        setVideoUrl('')
        setImageFile(null)
        setPreview(null)
        setIsDragging(false)
        setCompressing(false)
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
            clientLogger.error('CreateMediaPostDialog', 'Image compression failed', { err })
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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (type !== 'clip' && !title.trim()) { toast.error('Title is required'); return }
        if ((type === 'video' || type === 'clip') && !videoUrl.trim()) { toast.error('URL is required'); return }
        if (type === 'gfx' && !imageFile) { toast.error('Image is required for GFX posts'); return }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.set('type', type)
            formData.set('title', type === 'clip' ? '' : title.trim())
            if (type !== 'clip' && description.trim()) formData.set('description', description.trim())
            if (type === 'video' || type === 'clip') formData.set('videoUrl', videoUrl.trim())
            if (type === 'gfx' && imageFile) formData.set('imageFile', imageFile)

            const result = await createMediaPostAction(formData)
            if (!result.ok) {
                toast.error(result.error.message)
                return
            }
            toast.success('Media post created')
            await mutateAllMedia()
            handleOpenChange(false)
        } catch (err) {
            clientLogger.error('CreateMediaPostDialog', 'Unexpected error', { err })
            toast.error('Unexpected error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>New Media Post</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as 'gfx' | 'video' | 'clip')}>
                            <SelectTrigger className="rounded-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gfx">GFX</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="clip">Clip (TikTok / Short-form)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {type !== 'clip' && (
                        <>
                            <div className="space-y-1">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="rounded-sm" />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Input id="description" value={description} onChange={e => setDescription(e.target.value)} className="rounded-sm" />
                            </div>
                        </>
                    )}

                    {type === 'gfx' && (
                        <div className="space-y-1">
                            <Label>Image</Label>
                            <div
                                className={`border-2 border-dashed rounded-sm p-4 text-center transition-colors ${
                                    isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
                                }`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                                onDrop={handleDrop}
                                onPaste={handlePaste}
                                tabIndex={0}
                            >
                                {preview ? (
                                    <div className="space-y-3">
                                        <img src={preview} alt="preview" className="max-h-48 mx-auto rounded object-contain" />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-sm"
                                            onClick={() => { setImageFile(null); setPreview(null) }}
                                        >
                                            Change
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-sm text-muted-foreground">{compressing ? 'Processing image...' : 'Drag & drop, paste, or click to upload'}</p>
                                        <Input id="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileChange} className="rounded-sm" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {(type === 'video' || type === 'clip') && (
                        <div className="space-y-1">
                            <Label htmlFor="videoUrl">
                                {type === 'clip' ? 'TikTok URL' : 'YouTube / Twitch URL'}
                            </Label>
                            <Input
                                id="videoUrl"
                                type="url"
                                placeholder={type === 'clip' ? 'https://www.tiktok.com/@user/video/...' : 'https://youtube.com/watch?v=...'}
                                value={videoUrl}
                                onChange={e => setVideoUrl(e.target.value)}
                                className="rounded-sm"
                            />
                            {type === 'clip' && (
                                <p className="text-[11px] text-muted-foreground">Thumbnail will be fetched automatically from TikTok.</p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" className="rounded-sm" onClick={() => handleOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" className="rounded-sm" disabled={loading || compressing}>
                            {loading ? 'Creating...' : 'Create'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
