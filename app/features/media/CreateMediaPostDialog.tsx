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
import { useAdminContextStore } from '@/app/stores/adminContextStore'
import { useTeamsBySeason } from '@/app/hooks/useTeams'
import { useTeamPlayers } from '@/app/hooks/usePlayers'
import AuthorPicker, { type AuthorSelection } from '@/app/features/media/AuthorPicker'

type MediaFormType = 'gfx' | 'video' | 'clip' | 'totw' | 'potw'

interface CreateMediaPostDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function CreateMediaPostDialog({ open, onOpenChange }: CreateMediaPostDialogProps) {
    const [type, setType] = useState<MediaFormType>('gfx')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [videoUrl, setVideoUrl] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [compressing, setCompressing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [teamId, setTeamId] = useState('')
    const [playerId, setPlayerId] = useState('')
    const [author, setAuthor] = useState<AuthorSelection | null>(null)

    const seasonId = useAdminContextStore(s => s.selectedSeasonId)
    const { teams } = useTeamsBySeason(type === 'totw' || type === 'potw' ? seasonId : null)
    const { players } = useTeamPlayers(type === 'potw' && teamId ? teamId : null, seasonId)

    const isImageType = type === 'gfx' || type === 'totw' || type === 'potw'

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
        setTeamId('')
        setPlayerId('')
        setAuthor(null)
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
        if (isImageType && !imageFile) { toast.error('Image is required'); return }
        if ((type === 'totw' || type === 'potw') && !seasonId) { toast.error('Select a season in the admin bar first'); return }
        if (type === 'totw' && !teamId) { toast.error('Select a team'); return }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.set('type', type)
            formData.set('title', type === 'clip' ? '' : title.trim())
            if (type !== 'clip' && description.trim()) formData.set('description', description.trim())
            if (type === 'video' || type === 'clip') formData.set('videoUrl', videoUrl.trim())
            if (isImageType && imageFile) formData.set('imageFile', imageFile)
            if (type === 'totw' && teamId) formData.set('teamId', teamId)
            if (type === 'potw' && playerId) formData.set('playerId', playerId)
            if ((type === 'totw' || type === 'potw') && seasonId) formData.set('seasonId', seasonId)
            if (type !== 'clip' && author) formData.set('authorId', author.id)

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
                    <div className={`grid gap-3 ${type !== 'clip' ? 'sm:grid-cols-[180px_1fr]' : ''}`}>
                        <div className="space-y-1">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={(v) => { setType(v as MediaFormType); setTeamId(''); setPlayerId('') }}>
                                <SelectTrigger className="rounded-sm w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gfx">GFX</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="clip">Clip (TikTok / Short-form)</SelectItem>
                                    <SelectItem value="totw">Team of the Week</SelectItem>
                                    <SelectItem value="potw">Player of the Week</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {type !== 'clip' && (
                            <div className="space-y-1">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="rounded-sm" />
                            </div>
                        )}
                    </div>

                    {type !== 'clip' && (
                        <>
                            <div className="space-y-1">
                                <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Input id="description" value={description} onChange={e => setDescription(e.target.value)} className="rounded-sm" />
                            </div>

                            <AuthorPicker value={author} onChange={setAuthor} />
                        </>
                    )}

                    {(type === 'totw' || type === 'potw') && (
                        <div className={`grid gap-3 ${type === 'potw' ? 'sm:grid-cols-2' : ''}`}>
                            <div className="space-y-1">
                                <Label>Team</Label>
                                <Select value={teamId} onValueChange={(v) => {
                                    setTeamId(v); setPlayerId('')
                                    if (type === 'totw') {
                                        const t = teams.find(x => x.id === v)
                                        setTitle(t ? `${t.name} - Team of the Week` : '')
                                    }
                                }}>
                                    <SelectTrigger className="rounded-sm w-full">
                                        <SelectValue placeholder={seasonId ? 'Select a team' : 'Select a season in the admin bar first'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {type === 'potw' && (
                                <div className="space-y-1">
                                    <Label>Player <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Select value={playerId} onValueChange={(v) => {
                                        setPlayerId(v)
                                        const p = players.find(x => x.id === v)
                                        setTitle(p ? `${p.display_name || p.username} - Player of the Week` : '')
                                    }} disabled={!teamId}>
                                        <SelectTrigger className="rounded-sm w-full">
                                            <SelectValue placeholder={teamId ? 'Select a player' : 'Select a team first'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {players.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.display_name || p.username}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {isImageType && (
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
                                        <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-sm object-contain" />
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
                                <p className="text-[11px] text-muted-foreground">Short links (vt.tiktok.com) and full URLs both work.</p>
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
