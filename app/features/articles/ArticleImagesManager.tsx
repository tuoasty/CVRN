"use client"

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import { Code, Trash2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Badge } from '@/app/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import ImageDropzone from '@/app/features/media/ImageDropzone'
import { useAllMediaPosts } from '@/app/hooks/useMediaPosts'
import { resolveMediaThumbnail } from '@/app/features/media/mediaUtils'
import { compressImage } from '@/app/utils/imageCompression'
import { clientLogger } from '@/app/utils/clientLogger'
import { toast } from '@/app/utils/toast'
import type { ImagePlacement } from '@/server/domains/article'

export interface ArticleImageItem {
    handle: string
    placement: ImagePlacement
    origin: 'existing' | 'upload' | 'link'
    mediaPostId: string | null
    file: File | null
    previewUrl: string | null
    label: string
}

const LINKABLE_TYPES = ['gfx', 'potw', 'totw', 'news', 'article']

export function nextImageHandle(items: ArticleImageItem[]): string {
    if (!items.some(i => i.handle === 'cover')) return 'cover'
    const letters = items.map(i => i.handle).filter(h => /^[a-z]$/.test(h))
    const maxCode = letters.length ? Math.max(...letters.map(h => h.charCodeAt(0))) : 96
    const next = maxCode + 1
    return next <= 122 ? String.fromCharCode(next) : `img${items.length}`
}

export function tokenForHandle(handle: string): string {
    return handle === 'cover' ? '[cover]' : `[image:${handle}]`
}

export function appendImagesToFormData(formData: FormData, items: ArticleImageItem[]) {
    const meta = items.map(i => ({
        handle:      i.handle,
        placement:   i.placement,
        kind:        i.origin === 'upload' ? 'upload' : 'link',
        mediaPostId: i.origin === 'upload' ? undefined : i.mediaPostId,
    }))
    formData.set('imagesMeta', JSON.stringify(meta))
    for (const i of items) {
        if (i.origin === 'upload' && i.file) formData.set(`file_${i.handle}`, i.file)
    }
}

interface Props {
    items: ArticleImageItem[]
    onChange: (items: ArticleImageItem[]) => void
    insertToken: (text: string) => void
}

export default function ArticleImagesManager({ items, onChange, insertToken }: Props) {
    const [compressing, setCompressing] = useState(false)

    async function acceptFile(file: File) {
        if (!file.type.startsWith('image/')) return
        setCompressing(true)
        try {
            const compressed = await compressImage(file, { maxDimension: 1920 })
            const handle = nextImageHandle(items)
            onChange([...items, {
                handle,
                placement:   'center',
                origin:      'upload',
                mediaPostId: null,
                file:        compressed,
                previewUrl:  URL.createObjectURL(compressed),
                label:       'Uploaded',
            }])
        } catch (err) {
            clientLogger.error('ArticleImagesManager', 'Image compression failed', { err })
            toast.error('Failed to process image')
        } finally {
            setCompressing(false)
        }
    }

    function setPlacement(handle: string, placement: ImagePlacement) {
        onChange(items.map(i => i.handle === handle ? { ...i, placement } : i))
    }

    function remove(handle: string) {
        onChange(items.filter(i => i.handle !== handle))
    }

    return (
        <div className="space-y-3">
            <Label>Images</Label>

            {items.length > 0 && (
                <div className="space-y-2">
                    {items.map(item => (
                        <div key={item.handle} className="flex items-center gap-3 p-2 rounded-sm border border-border bg-card">
                            <div className="relative w-14 h-9 flex-shrink-0 rounded-sm border border-border overflow-hidden bg-muted">
                                {item.previewUrl && (
                                    <img src={item.previewUrl} alt={item.handle} className="absolute inset-0 h-full w-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <Badge variant={item.handle === 'cover' ? 'default' : 'secondary'} className="rounded-sm text-xs px-1.5 py-0 uppercase">
                                        {item.handle}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground truncate">{item.label}</span>
                                </div>
                            </div>
                            <Select value={item.placement} onValueChange={v => setPlacement(item.handle, v as ImagePlacement)}>
                                <SelectTrigger className="h-8 w-24 rounded-sm text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm gap-1 px-2" onClick={() => insertToken(tokenForHandle(item.handle))}>
                                <Code className="h-3.5 w-3.5" /> Token
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-sm text-destructive" onClick={() => remove(item.handle)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <Tabs defaultValue="upload" className="space-y-2">
                <TabsList>
                    <TabsTrigger value="upload">Upload new</TabsTrigger>
                    <TabsTrigger value="link">Link existing</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-0">
                    <ImageDropzone
                        preview={null}
                        compressing={compressing}
                        onFile={acceptFile}
                        onClear={() => {}}
                        previewMaxHeight="max-h-32"
                    />
                </TabsContent>
                <TabsContent value="link" className="mt-0">
                    <LinkExisting items={items} onAdd={post => {
                        const handle = nextImageHandle(items)
                        onChange([...items, {
                            handle,
                            placement:   'center',
                            origin:      'link',
                            mediaPostId: post.id,
                            file:        null,
                            previewUrl:  resolveMediaThumbnail(post.image_url, post.video_url),
                            label:       `Linked: ${post.title}`,
                        }])
                    }} />
                </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground">
                First image is the cover (thumbnail + fallback hero). Click <span className="font-mono">Token</span> to drop an image into the body where your cursor sits. Match GFX always leads as the hero.
            </p>
        </div>
    )
}

function LinkExisting({ items, onAdd }: { items: ArticleImageItem[]; onAdd: (post: { id: string; title: string; image_url: string | null; video_url: string | null }) => void }) {
    const { posts, isLoading } = useAllMediaPosts()
    const [search, setSearch] = useState('')

    const candidates = useMemo(() => {
        const q = search.trim().toLowerCase()
        const usedIds = new Set(items.map(i => i.mediaPostId).filter((v): v is string => !!v))
        return posts
            .filter(p => LINKABLE_TYPES.includes(p.type) && !!p.image_url && !usedIds.has(p.id))
            .filter(p => !q || p.title.toLowerCase().includes(q))
    }, [posts, items, search])

    return (
        <div className="space-y-2">
            <Input
                placeholder="Search media (GFX, POTW, TOTW, articles)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="rounded-sm"
            />
            <div className="max-h-48 overflow-y-auto space-y-1.5">
                {isLoading ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
                ) : candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No matching media.</p>
                ) : (
                    candidates.map(post => {
                        const thumbnail = resolveMediaThumbnail(post.image_url, post.video_url)
                        return (
                            <button
                                key={post.id}
                                type="button"
                                onClick={() => onAdd(post)}
                                className="w-full flex items-center gap-3 p-2 rounded-sm border border-border bg-card text-left hover:bg-muted/30 transition-colors"
                            >
                                {thumbnail && (
                                    <div className="relative w-12 h-8 flex-shrink-0 rounded-sm border border-border overflow-hidden">
                                        <Image src={thumbnail} alt={post.title} fill sizes="48px" unoptimized className="object-cover" />
                                    </div>
                                )}
                                <span className="flex-1 min-w-0 text-sm truncate">{post.title}</span>
                                <Badge variant="secondary" className="rounded-sm text-xs uppercase shrink-0">{post.type}</Badge>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
