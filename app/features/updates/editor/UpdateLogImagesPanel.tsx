"use client"

import { useRef, useState, type KeyboardEvent } from 'react'
import { Code, ImagePlus, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Badge } from '@/app/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/dialog'
import { cn } from '@/lib/utils'
import { IMAGE_NAME_MAX, imageToken } from '@/shared/utils/imageTokens'
import type { EditorImage } from './editorImages'

interface NameFieldProps {
    image: EditorImage
    onRename: (key: string, name: string) => string | null
}

function NameField({ image, onRename }: NameFieldProps) {
    const [value, setValue] = useState(image.name)
    const [error, setError] = useState<string | null>(null)

    function commit() {
        if (value.trim().toLowerCase() === image.name) {
            setValue(image.name)
            setError(null)
            return
        }
        const problem = onRename(image.key, value)
        setError(problem)
        if (!problem) setValue(value.trim().toLowerCase())
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault()
            commit()
        } else if (e.key === 'Escape') {
            setValue(image.name)
            setError(null)
        }
    }

    return (
        <div className="min-w-0 flex-1">
            <Input
                aria-label="Image name"
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={commit}
                onKeyDown={onKeyDown}
                maxLength={IMAGE_NAME_MAX}
                spellCheck={false}
                autoComplete="off"
                className={cn('h-8 rounded-sm px-2 font-mono text-xs', error && 'border-destructive')}
            />
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    )
}

function StatusBadge({ image, uses }: { image: EditorImage; uses: number }) {
    const label = !image.id ? 'Pending' : uses > 0 ? `Used ×${uses}` : 'Unused'
    return (
        <Badge
            variant="outline"
            className={cn(
                'shrink-0 rounded-sm px-1.5 py-0 font-mono text-xs uppercase tracking-normal',
                image.id && uses > 0 ? 'text-foreground' : 'text-muted-foreground',
            )}
        >
            {label}
        </Badge>
    )
}

interface Props {
    images: EditorImage[]
    uses: Map<string, number>
    missing: [string, number][]
    processing: boolean
    onAddFiles: (files: File[]) => void
    onRename: (key: string, name: string) => string | null
    onCaption: (key: string, caption: string) => void
    onInsert: (name: string) => void
    onRemove: (key: string) => void
}

export default function UpdateLogImagesPanel({ images, uses, missing, processing, onAddFiles, onRename, onCaption, onInsert, onRemove }: Props) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [enlarged, setEnlarged] = useState<EditorImage | null>(null)

    return (
        <aside aria-label="Images" className="space-y-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
            <div className="flex items-center justify-between gap-2">
                <Label>
                    Images <span className="font-mono tabular-nums text-muted-foreground">{images.length}</span>
                </Label>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-sm" onClick={() => fileRef.current?.click()} disabled={processing}>
                    <ImagePlus className="h-4 w-4" /> Add
                </Button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={e => {
                        const files = Array.from(e.target.files ?? [])
                        e.target.value = ''
                        if (files.length > 0) onAddFiles(files)
                    }}
                />
            </div>

            {processing && <p className="text-xs text-muted-foreground">Processing images…</p>}

            {images.length === 0 && !processing && (
                <p className="text-xs text-muted-foreground">Paste or drop screenshots into the body, or add them here.</p>
            )}

            <ul className="space-y-3">
                {images.map(image => (
                    <li key={image.key} className="panel overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setEnlarged(image)}
                            aria-label={`Preview ${image.name}`}
                            className="block aspect-video w-full bg-muted"
                        >
                            <img src={image.url} alt="" className="h-full w-full object-contain" />
                        </button>
                        <div className="space-y-2 p-2.5">
                            <div className="flex items-start gap-2">
                                <NameField key={image.name} image={image} onRename={onRename} />
                                <span className="pt-1.5"><StatusBadge image={image} uses={uses.get(image.name) ?? 0} /></span>
                            </div>
                            <Input
                                aria-label="Caption"
                                value={image.caption}
                                onChange={e => onCaption(image.key, e.target.value)}
                                placeholder="Caption (optional)"
                                maxLength={200}
                                className="h-8 rounded-sm px-2 text-xs"
                            />
                            <div className="flex items-center gap-1.5">
                                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 rounded-sm px-2 text-xs" onClick={() => onInsert(image.name)}>
                                    <Code className="h-3.5 w-3.5" /> Insert token
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Remove ${image.name}`}
                                    className="ml-auto h-7 w-7 rounded-sm p-0 text-destructive hover:bg-destructive/10"
                                    onClick={() => onRemove(image.key)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            {missing.length > 0 && (
                <div className="space-y-1.5 border-t border-border pt-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">
                        <TriangleAlert className="h-3.5 w-3.5" /> Missing images
                    </p>
                    <ul className="space-y-1">
                        {missing.map(([name, count]) => (
                            <li key={name} className="flex items-center justify-between gap-2 text-xs">
                                <code className="truncate font-mono">{imageToken(name)}</code>
                                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">×{count}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">Attach an image with that name to fill these in.</p>
                </div>
            )}

            <Dialog open={!!enlarged} onOpenChange={open => { if (!open) setEnlarged(null) }}>
                <DialogContent className="max-w-5xl rounded-sm p-3">
                    <DialogTitle className="font-mono text-sm">{enlarged?.name}</DialogTitle>
                    {enlarged && (
                        <img src={enlarged.url} alt={enlarged.caption} className="max-h-[80vh] w-full rounded-sm bg-muted object-contain" />
                    )}
                    {enlarged?.caption && <p className="text-xs text-muted-foreground">{enlarged.caption}</p>}
                </DialogContent>
            </Dialog>
        </aside>
    )
}
