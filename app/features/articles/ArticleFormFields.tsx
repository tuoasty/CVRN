"use client"

import React, { useRef } from 'react'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Button } from '@/app/components/ui/button'
import AuthorPicker, { type AuthorSelection } from '@/app/features/media/AuthorPicker'
import MatchPicker, { type MatchSelection } from '@/app/features/articles/MatchPicker'

const COVER_TOKEN = '[cover]'

interface ArticleFormFieldsProps {
    idPrefix: string
    title: string
    onTitleChange: (v: string) => void
    body: string
    onBodyChange: (v: string) => void
    onBodyPaste?: (e: React.ClipboardEvent) => void
    author: AuthorSelection | null
    onAuthorChange: (v: AuthorSelection | null) => void
    seasonId: string | null
    match: MatchSelection | null
    onMatchChange: (v: MatchSelection | null) => void
    topSlot?: React.ReactNode
    coverSlot: React.ReactNode
}

export default function ArticleFormFields({
    idPrefix,
    title,
    onTitleChange,
    body,
    onBodyChange,
    onBodyPaste,
    author,
    onAuthorChange,
    seasonId,
    match,
    onMatchChange,
    topSlot,
    coverSlot,
}: ArticleFormFieldsProps) {
    const bodyRef = useRef<HTMLTextAreaElement>(null)
    const hasCoverToken = body.includes(COVER_TOKEN)

    function insertCover() {
        const marker = `\n${COVER_TOKEN}\n`
        const el = bodyRef.current
        if (!el) {
            onBodyChange(`${body}${marker}`)
            return
        }
        const start = el.selectionStart
        const end = el.selectionEnd
        onBodyChange(body.slice(0, start) + marker + body.slice(end))
        requestAnimationFrame(() => {
            el.focus()
            const pos = start + marker.length
            el.setSelectionRange(pos, pos)
        })
    }

    return (
        <div className="grid lg:grid-cols-[1fr_380px] flex-1 min-h-0">
            <div className="flex flex-col min-h-0 p-6 gap-4 border-r border-border">
                <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-title`}>Title</Label>
                    <Input id={`${idPrefix}-title`} value={title} onChange={e => onTitleChange(e.target.value)} className="rounded-sm text-lg" />
                </div>
                <div className="flex flex-col flex-1 min-h-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`${idPrefix}-body`}>Body <span className="text-muted-foreground text-xs">(Discord markdown)</span></Label>
                        <Button type="button" variant="outline" size="sm" className="h-7 rounded-sm" onClick={insertCover} disabled={hasCoverToken}>
                            {hasCoverToken ? 'Cover placed' : 'Insert cover here'}
                        </Button>
                    </div>
                    <textarea
                        ref={bodyRef}
                        id={`${idPrefix}-body`}
                        value={body}
                        onChange={e => onBodyChange(e.target.value)}
                        onPaste={onBodyPaste}
                        className="flex-1 min-h-0 w-full resize-none rounded-sm border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Paste the article body here. **bold**, *italic*, # headers, > quotes, lists, `code`."
                    />
                    <p className="text-xs text-muted-foreground">
                        The cover renders where <code className="font-mono">[cover]</code> sits in the text. No marker → it leads the article.
                    </p>
                </div>
            </div>

            <div className="flex flex-col min-h-0 overflow-y-auto p-6 gap-5">
                {topSlot}
                <AuthorPicker value={author} onChange={onAuthorChange} />
                <MatchPicker seasonId={seasonId} value={match} onChange={onMatchChange} />
                {coverSlot}
            </div>
        </div>
    )
}
