"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { getArticleBySlugAction, updateArticleAction } from '@/app/actions/article.actions'
import { mutateArticles } from '@/app/hooks/useArticles'
import { mutateAllMedia } from '@/app/hooks/useMediaPosts'
import { toast } from '@/app/utils/toast'
import { clientLogger } from '@/app/utils/clientLogger'
import { useAllMatches } from '@/app/hooks/useMatches'
import { useTeamsBySeason } from '@/app/hooks/useTeams'
import { type AuthorSelection } from '@/app/features/media/AuthorPicker'
import { type MatchSelection } from '@/app/features/articles/MatchPicker'
import ArticleFormFields from '@/app/features/articles/ArticleFormFields'
import ArticleImagesManager, { type ArticleImageItem, appendImagesToFormData } from '@/app/features/articles/ArticleImagesManager'
import SlugFields from '@/app/features/articles/SlugFields'
import { useSlugField } from '@/app/features/articles/useSlugField'
import SeasonSelect from '@/app/features/articles/SeasonSelect'
import type { ArticleListItem } from '@/server/domains/article'

interface EditArticleDialogProps {
    article: ArticleListItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

const PENDING_LABEL = '(linked match)'

export default function EditArticleDialog({ article, open, onOpenChange }: EditArticleDialogProps) {
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const slugField = useSlugField()
    const { setInitialSlug } = slugField
    const [author, setAuthor] = useState<AuthorSelection | null>(null)
    const [match, setMatch] = useState<MatchSelection | null>(null)
    const [seasonId, setSeasonId] = useState<string | null>(null)
    const [images, setImages] = useState<ArticleImageItem[]>([])
    const [fetching, setFetching] = useState(false)
    const [loading, setLoading] = useState(false)
    const loadedSlugRef = useRef<string | null>(null)

    const { matches } = useAllMatches()
    const { teams } = useTeamsBySeason(seasonId)

    const teamName = useMemo(() => {
        const map = new Map<string, string>()
        for (const t of teams) map.set(t.id, t.name)
        return map
    }, [teams])

    useEffect(() => {
        if (!open) { loadedSlugRef.current = null; return }
        if (!article) return
        if (loadedSlugRef.current === article.slug) return
        loadedSlugRef.current = article.slug
        let cancelled = false
        setFetching(true)
        getArticleBySlugAction(article.slug)
            .then(res => {
                if (cancelled) return
                if (!res.ok || !res.value) { toast.error('Failed to load article'); onOpenChange(false); return }
                const d = res.value
                setTitle(d.title)
                setBody(d.body)
                setInitialSlug(d.slug)
                setSeasonId(d.season_id)
                setAuthor(d.author ? { id: d.author.id, label: d.author.display_name || d.author.username, avatarUrl: d.author.avatar_url } : null)
                setMatch(d.match_id ? { id: d.match_id, label: PENDING_LABEL } : null)
                setImages(d.images.map(im => ({
                    handle:      im.handle,
                    placement:   im.placement,
                    origin:      'existing' as const,
                    mediaPostId: im.mediaPostId,
                    file:        null,
                    previewUrl:  im.url,
                    label:       im.handle === 'cover' ? 'Cover (existing)' : 'Existing',
                })))
            })
            .finally(() => { if (!cancelled) setFetching(false) })
        return () => { cancelled = true }
    }, [open, article, onOpenChange, setInitialSlug])

    useEffect(() => {
        if (!match || match.label !== PENDING_LABEL) return
        const m = matches.find(x => x.id === match.id)
        if (!m) return
        const home = m.home_team_id ? teamName.get(m.home_team_id) ?? 'TBD' : 'TBD'
        const away = m.away_team_id ? teamName.get(m.away_team_id) ?? 'TBD' : 'TBD'
        setMatch({ id: m.id, label: `${home} vs ${away}${m.match_code ? ` · ${m.match_code}` : ''}` })
    }, [matches, teamName, match])

    async function handleSubmit() {
        if (!article) return
        if (!title.trim()) { toast.error('Title is required'); return }
        if (!body.trim()) { toast.error('Body is required'); return }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.set('articleId', article.id)
            formData.set('title', title.trim())
            formData.set('body', body)
            if (slugField.slug.trim()) formData.set('slug', slugField.canonicalSlug)
            formData.set('authorId', author ? author.id : '')
            formData.set('matchId', match ? match.id : '')
            formData.set('seasonId', seasonId ?? '')
            appendImagesToFormData(formData, images)

            const result = await updateArticleAction(formData)
            if (!result.ok) {
                toast.error(result.error.message)
                return
            }
            toast.success('Article updated')
            await Promise.all([mutateArticles(), mutateAllMedia()])
            onOpenChange(false)
        } catch (err) {
            clientLogger.error('EditArticleDialog', 'Unexpected error', { err })
            toast.error('Unexpected error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none sm:max-w-none w-[97vw] h-[94vh] flex flex-col p-0 gap-0 rounded-sm overflow-hidden">
                <DialogHeader className="px-6 py-4 pr-14 border-b border-border flex-row items-center justify-between space-y-0 gap-4">
                    <DialogTitle>Edit Article</DialogTitle>
                    {!fetching && (
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Season</Label>
                            <SeasonSelect value={seasonId} onChange={setSeasonId} />
                        </div>
                    )}
                </DialogHeader>

                {fetching ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 min-h-0">
                        <ArticleFormFields
                            idPrefix="edit"
                            title={title}
                            onTitleChange={setTitle}
                            body={body}
                            onBodyChange={setBody}
                            author={author}
                            onAuthorChange={setAuthor}
                            seasonId={seasonId}
                            match={match}
                            onMatchChange={setMatch}
                            topSlot={
                                <SlugFields
                                    idPrefix="edit"
                                    shortName={slugField.shortName}
                                    slug={slugField.slug}
                                    canonicalSlug={slugField.canonicalSlug}
                                    onShortNameChange={slugField.setShortName}
                                    onSlugChange={slugField.setSlug}
                                />
                            }
                            imagesSlot={insert => (
                                <ArticleImagesManager items={images} onChange={setImages} insertToken={insert} />
                            )}
                        />

                        <div className="flex justify-end gap-2 px-6 py-3 border-t border-border">
                            <Button type="button" variant="ghost" size="sm" className="rounded-sm" onClick={() => onOpenChange(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleSubmit} size="sm" className="rounded-sm" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
