"use client"

import React, { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Trophy, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import ImageDropzone from "@/app/features/media/ImageDropzone"
import AuthorPicker, { type AuthorSelection } from "@/app/features/media/AuthorPicker"
import { createMediaPostAction, deleteMediaPostAction, getAllMediaPostsAction } from "@/app/actions/media.actions"
import { MediaPost } from "@/server/domains/media"
import { compressImage } from "@/app/utils/imageCompression"
import { toast } from "@/app/utils/toast"
import { clientLogger } from "@/app/utils/clientLogger"

interface ChampionGfxBlockProps {
    seasonId: string
    seasonName?: string | null
}

export default function ChampionGfxBlock({ seasonId, seasonName }: ChampionGfxBlockProps) {
    const [current, setCurrent] = useState<MediaPost | null>(null)
    const [loading, setLoading] = useState(true)
    const [title, setTitle] = useState("")
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [compressing, setCompressing] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [author, setAuthor] = useState<AuthorSelection | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await getAllMediaPostsAction({ type: "champion", seasonId })
            setCurrent(res.ok ? (res.value[0] ?? null) : null)
        } finally {
            setLoading(false)
        }
    }, [seasonId])

    useEffect(() => { load() }, [load])

    async function acceptFile(file: File) {
        if (!file.type.startsWith("image/")) return
        setCompressing(true)
        try {
            const compressed = await compressImage(file, { maxDimension: 1920 })
            setImageFile(compressed)
            setPreview(URL.createObjectURL(compressed))
        } catch (err) {
            clientLogger.error("ChampionGfxBlock", "Image compression failed", { err })
            toast.error("Failed to process image")
        } finally {
            setCompressing(false)
        }
    }

    function clearFile() {
        setImageFile(null)
        setPreview(null)
    }

    async function handleUpload() {
        if (!imageFile) { toast.error("Image is required"); return }
        setUploading(true)
        try {
            const formData = new FormData()
            formData.set("type", "champion")
            formData.set("title", title.trim() || `${seasonName ?? "Season"} Champion`)
            formData.set("seasonId", seasonId)
            formData.set("imageFile", imageFile)
            if (author) formData.set("authorId", author.id)

            const result = await createMediaPostAction(formData)
            if (!result.ok) { toast.error(result.error.message); return }
            toast.success("Champion GFX uploaded")
            setTitle("")
            setAuthor(null)
            clearFile()
            await load()
        } catch (err) {
            clientLogger.error("ChampionGfxBlock", "Unexpected error", { err })
            toast.error("Unexpected error")
        } finally {
            setUploading(false)
        }
    }

    async function handleDelete() {
        if (!current) return
        setDeleting(true)
        try {
            const result = await deleteMediaPostAction({ postId: current.id })
            if (!result.ok) { toast.error(result.error.message); return }
            toast.success("Champion GFX removed")
            await load()
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Trophy className="h-4 w-4" /> Champion GFX
                </h2>
            </div>

            {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
            ) : current?.image_url ? (
                <div className="panel p-3 space-y-3">
                    <div className="relative w-full max-w-xl aspect-video">
                        <Image
                            src={current.image_url}
                            alt={current.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 576px"
                            className="object-contain"
                        />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{current.title}</span>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-sm gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            Delete
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="panel p-3 space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="champion-title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Input
                            id="champion-title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={`${seasonName ?? "Season"} Champion`}
                            className="rounded-sm max-w-xl"
                        />
                    </div>
                    <div className="max-w-xl">
                        <AuthorPicker value={author} onChange={setAuthor} />
                    </div>
                    <ImageDropzone
                        preview={preview}
                        onFile={acceptFile}
                        onClear={clearFile}
                        compressing={compressing}
                        className="max-w-xl"
                    />
                    <Button
                        size="sm"
                        className="rounded-sm gap-1.5"
                        onClick={handleUpload}
                        disabled={uploading || compressing || !imageFile}
                    >
                        {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trophy className="h-3.5 w-3.5" />}
                        {uploading ? "Uploading..." : "Upload GFX"}
                    </Button>
                </div>
            )}
        </div>
    )
}
