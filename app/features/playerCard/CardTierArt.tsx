'use client'

import { useEffect, useRef, useState } from 'react'
import { uploadCardArt } from '@/app/hooks/usePlayerCard'
import { toast } from '@/app/utils/toast'
import type { CardGroup, CardTemplateSummary } from '@/server/domains/playerCard'
import { ArtSlot, artFitWarning, checkArtFile, formatArtSize, layoutArtSlots } from './cardArt'
import { FIELD_LABEL, LINK } from './cardFormStyles'

export const ART_HINT = 'PNG only, up to 2.9 MB. Stored exactly as uploaded, with no resizing or compression.'

function ArtRow({ slot, imageUrl, size, actionLabel, busy, onFile }: {
    slot: ArtSlot
    imageUrl: string | null
    size: number | null
    actionLabel: string
    busy: boolean
    onFile: (file: File) => void
}) {
    const input = useRef<HTMLInputElement>(null)
    const [natural, setNatural] = useState<{ width: number; height: number } | null>(null)
    const shown = imageUrl ? natural : null
    const warning = shown ? artFitWarning(shown, slot) : null

    async function pick(file: File | undefined) {
        if (input.current) input.current.value = ''
        if (!file) return
        const problem = await checkArtFile(file)
        if (problem) {
            toast.error(`${slot.name} not added`, problem)
            return
        }
        onFile(file)
    }

    return (
        <div className="flex items-start gap-3">
            <div
                className="relative w-14 shrink-0 overflow-hidden border border-border bg-muted"
                style={{ aspectRatio: `${slot.w} / ${slot.h}` }}
            >
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        onLoad={e => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                    />
                )}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-mono text-xs text-foreground">{slot.name}</span>
                    <button type="button" className={LINK} disabled={busy} onClick={() => input.current?.click()}>
                        {busy ? 'Uploading…' : actionLabel}
                    </button>
                </div>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {imageUrl
                        ? [shown && `${shown.width} × ${shown.height}`, size !== null && formatArtSize(size)].filter(Boolean).join(' · ')
                        : 'No file yet'}
                </span>
                {warning && <span className="text-xs font-medium text-foreground">{warning}</span>}
            </div>
            <input
                ref={input}
                type="file"
                accept="image/png"
                className="hidden"
                aria-label={`Choose ${slot.name}`}
                onChange={e => void pick(e.target.files?.[0])}
            />
        </div>
    )
}

function StagedArtRow({ slot, file, onFile }: {
    slot: ArtSlot
    file: File | null
    onFile: (file: File) => void
}) {
    const [url, setUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!file) {
            setUrl(null)
            return
        }
        const objectUrl = URL.createObjectURL(file)
        setUrl(objectUrl)
        return () => URL.revokeObjectURL(objectUrl)
    }, [file])

    return (
        <ArtRow
            slot={slot}
            imageUrl={url}
            size={file?.size ?? null}
            actionLabel={file ? 'Change' : 'Choose file'}
            busy={false}
            onFile={onFile}
        />
    )
}

export function CardTierArtPicker({ group, files, onChange }: {
    group: CardGroup
    files: Record<string, File>
    onChange: (files: Record<string, File>) => void
}) {
    const slots = layoutArtSlots(group.layers ?? [])

    return (
        <div className="flex flex-col gap-2">
            <span className={FIELD_LABEL}>Art</span>
            {slots.length === 0 ? (
                <p className="text-xs text-destructive">
                    The {group.name} layout has no art layer, so it cannot take tiers. Create a new group copied from one that has art.
                </p>
            ) : (
                <>
                    {slots.map(slot => (
                        <StagedArtRow
                            key={slot.name}
                            slot={slot}
                            file={files[slot.name] ?? null}
                            onFile={file => onChange({ ...files, [slot.name]: file })}
                        />
                    ))}
                    <p className="text-xs text-muted-foreground">{ART_HINT}</p>
                </>
            )}
        </div>
    )
}

export default function CardTierArt({ group, template }: { group: CardGroup; template: CardTemplateSummary }) {
    const [uploading, setUploading] = useState<string | null>(null)
    const slots = layoutArtSlots(group.layers ?? [])

    async function upload(name: string, file: File) {
        setUploading(name)
        try {
            const result = await uploadCardArt(template.id, name, file)
            if (!result.ok) {
                toast.error(`${name} not uploaded`, result.error.message)
                return
            }
            toast.success(`Uploaded ${name} for ${template.name}`)
        } finally {
            setUploading(null)
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <span className={FIELD_LABEL}>Art</span>
            {slots.length === 0 ? (
                <p className="text-xs text-muted-foreground">The {group.name} layout has no art layer, so this tier has nothing to upload.</p>
            ) : (
                <>
                    {slots.map(slot => {
                        const stored = template.art.find(f => f.name === slot.name) ?? null
                        return (
                            <ArtRow
                                key={slot.name}
                                slot={slot}
                                imageUrl={stored?.url ?? null}
                                size={stored?.size ?? null}
                                actionLabel={stored ? 'Replace' : 'Upload'}
                                busy={uploading === slot.name}
                                onFile={file => void upload(slot.name, file)}
                            />
                        )
                    })}
                    <p className="text-xs text-muted-foreground">{ART_HINT} Saved cards keep the art they were made with.</p>
                </>
            )}
        </div>
    )
}
