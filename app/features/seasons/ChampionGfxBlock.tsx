"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import AuthorPicker, { type AuthorSelection } from "@/app/features/media/AuthorPicker"
import { createMediaPostAction, deleteMediaPostAction, getAllMediaPostsAction } from "@/app/actions/media.actions"
import { MediaPost } from "@/server/domains/media"
import { compressImage } from "@/app/utils/imageCompression"
import { toast } from "@/app/utils/toast"
import { clientLogger } from "@/app/utils/clientLogger"
import { cn } from "@/lib/utils"
import { SectionHeader, TextAction } from "@/app/features/seasons/results/ResultsUi"

interface ChampionGfxBlockProps {
    seasonId: string
    seasonName?: string | null
    initialPost?: MediaPost | null
}

function Thumb({ src, alt }: { src: string | null; alt: string }) {
    return (
        <span className="relative block h-9 w-16 shrink-0 overflow-hidden bg-muted">
            {src && <Image src={src} alt={alt} fill sizes="64px" unoptimized className="object-cover" />}
        </span>
    )
}

export default function ChampionGfxBlock({ seasonId, seasonName, initialPost }: ChampionGfxBlockProps) {
    const [current, setCurrent] = useState<MediaPost | null>(initialPost ?? null)
    const [loaded, setLoaded] = useState(initialPost !== undefined)
    const [title, setTitle] = useState("")
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [compressing, setCompressing] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [author, setAuthor] = useState<AuthorSelection | null>(null)
    const [dragging, setDragging] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const fetchCurrent = useCallback(async () => {
        const res = await getAllMediaPostsAction({ type: "champion", seasonId })
        setCurrent(res.ok ? (res.value[0] ?? null) : null)
        setLoaded(true)
    }, [seasonId])

    useEffect(() => {
        if (initialPost === undefined) fetchCurrent()
    }, [fetchCurrent, initialPost])

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

    async function acceptFile(file: File) {
        if (!file.type.startsWith("image/")) { toast.error("Choose an image file"); return }
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

    function clearPending() {
        setImageFile(null)
        setPreview(null)
        setTitle("")
        setAuthor(null)
        if (fileRef.current) fileRef.current.value = ""
    }

    async function handleUpload() {
        if (!imageFile) return
        setUploading(true)
        try {
            const formData = new FormData()
            formData.set("type", "champion")
            formData.set("title", title.trim() || `${seasonName ?? "Season"} Champion`)
            formData.set("seasonId", seasonId)
            formData.set("imageFile", imageFile)
            if (author) formData.set("authorId", author.id)

            if (current) {
                const removed = await deleteMediaPostAction({ postId: current.id })
                if (!removed.ok) { toast.error("Could not remove the current GFX", removed.error.message); return }
                setCurrent(null)
            }
            const result = await createMediaPostAction(formData)
            if (!result.ok) { toast.error(result.error.message); return }
            clearPending()
            await fetchCurrent()
            toast.success(current ? "Champion GFX replaced" : "Champion GFX uploaded")
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
            setCurrent(null)
            toast.success("Champion GFX removed")
        } finally {
            setDeleting(false)
        }
    }

    const busy = compressing || uploading

    return (
        <section>
            <SectionHeader title="Champion GFX" />
            <div
                className={cn("flex items-center gap-2 px-1 pt-2", dragging && "outline-dashed outline-1 outline-ring")}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                    e.preventDefault()
                    setDragging(false)
                    const file = e.dataTransfer.files[0]
                    if (file) acceptFile(file)
                }}
            >
                <Thumb src={preview ?? current?.image_url ?? null} alt={preview ? "New champion GFX" : current?.title ?? ""} />
                <span className="min-w-0 flex-1 truncate text-sm">
                    {preview
                        ? <span className="text-muted-foreground">New image ready</span>
                        : current
                            ? current.title
                            : <span className="text-muted-foreground">{loaded ? "No GFX yet" : ""}</span>}
                </span>
                {!preview && (
                    <>
                        <TextAction disabled={busy || !loaded} onClick={() => fileRef.current?.click()}>
                            {compressing && <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />}
                            {current ? "Replace" : "Upload"}
                        </TextAction>
                        {current && (
                            <TextAction tone="danger" disabled={deleting} onClick={handleDelete}>
                                {deleting && <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />}
                                Remove
                            </TextAction>
                        )}
                    </>
                )}
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={e => { const file = e.target.files?.[0]; if (file) acceptFile(file) }}
                />
            </div>
            {preview && (
                <div className="space-y-2 px-1 pt-2">
                    <Input
                        aria-label="GFX title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder={`${seasonName ?? "Season"} Champion`}
                        className="h-8 rounded-md"
                    />
                    <AuthorPicker value={author} onChange={setAuthor} />
                    <div className="flex items-center justify-end gap-3">
                        <TextAction tone="quiet" disabled={uploading} onClick={clearPending}>Cancel</TextAction>
                        <Button size="sm" className="rounded-md" disabled={busy || !imageFile} onClick={handleUpload}>
                            {uploading && <Loader2 className="animate-spin motion-reduce:animate-none" />}
                            {current ? "Replace GFX" : "Upload GFX"}
                        </Button>
                    </div>
                </div>
            )}
        </section>
    )
}
