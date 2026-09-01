"use client"

import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { SLUG_MAX_LENGTH } from '@/app/features/articles/useSlugField'

interface SlugFieldsProps {
    idPrefix: string
    shortName: string
    slug: string
    canonicalSlug: string
    onShortNameChange: (v: string) => void
    onSlugChange: (v: string) => void
}

export default function SlugFields({ idPrefix, shortName, slug, canonicalSlug, onShortNameChange, onSlugChange }: SlugFieldsProps) {
    return (
        <div className="space-y-2">
            <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-shortName`}>
                    Short name <span className="text-muted-foreground text-xs">(builds the slug — not saved)</span>
                </Label>
                <Input id={`${idPrefix}-shortName`} value={shortName} onChange={e => onShortNameChange(e.target.value)} className="rounded-sm" placeholder="e.g. Grand Finals Recap" />
            </div>
            <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-slug`}>
                    Slug <span className="text-muted-foreground text-xs">(URL — editable)</span>
                </Label>
                <Input id={`${idPrefix}-slug`} value={slug} onChange={e => onSlugChange(e.target.value)} maxLength={SLUG_MAX_LENGTH} className="rounded-sm font-mono text-xs" placeholder="grand-finals-recap" />
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                        {slug.trim() ? `/articles/…/${canonicalSlug}` : 'Leave blank to auto-generate from the title.'}
                    </p>
                    {slug.trim() && (
                        <span className="text-xs font-mono text-muted-foreground shrink-0 tabular-nums">{canonicalSlug.length}/{SLUG_MAX_LENGTH}</span>
                    )}
                </div>
            </div>
        </div>
    )
}
