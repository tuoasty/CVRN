"use client"

import React, { useRef, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { cn } from '@/lib/utils'

type Props = {
    preview: string | null
    onFile: (file: File) => void
    onClear: () => void
    compressing?: boolean
    clearLabel?: string
    previewMaxHeight?: string
    className?: string
}

export default function ImageDropzone({
    preview,
    onFile,
    onClear,
    compressing = false,
    clearLabel = 'Remove',
    previewMaxHeight = 'max-h-48',
    className,
}: Props) {
    const zoneRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    function handlePaste(e: React.ClipboardEvent) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
            if (e.clipboardData.items[i].type.startsWith('image/')) {
                const file = e.clipboardData.items[i].getAsFile()
                if (file) { onFile(file); break }
            }
        }
    }

    return (
        <div
            ref={zoneRef}
            tabIndex={0}
            role="button"
            aria-label="Paste, drop, or choose an image"
            onClick={() => zoneRef.current?.focus()}
            onPaste={handlePaste}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
            onDrop={e => {
                e.preventDefault()
                setIsDragging(false)
                const file = e.dataTransfer.files[0]
                if (file) onFile(file)
            }}
            className={cn(
                'rounded-sm border-2 border-dashed p-4 text-center outline-none transition-colors cursor-pointer',
                'focus:border-primary focus:ring-2 focus:ring-primary/40',
                isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25',
                className,
            )}
        >
            {preview ? (
                <div className="space-y-3">
                    <img src={preview} alt="preview" className={cn('mx-auto rounded-sm object-contain', previewMaxHeight)} />
                    <Button type="button" variant="outline" size="sm" className="rounded-sm" onClick={e => { e.stopPropagation(); onClear() }}>
                        {clearLabel}
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        {compressing ? 'Processing image…' : 'Click here, then press Ctrl+V to paste — or drag & drop / browse below'}
                    </p>
                    <Input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onClick={e => e.stopPropagation()}
                        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
                        className="rounded-sm"
                    />
                </div>
            )}
        </div>
    )
}
