"use client"

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Badge } from '@/app/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip'
import ConfirmDialog from '@/app/features/spec/catalog/ConfirmDialog'
import { useLeaveGuard } from '@/app/features/spec/catalog/useLeaveGuard'
import {
    createUpdateLogAction,
    updateUpdateLogAction,
    setUpdateLogPublishedAction,
} from '@/app/actions/updateLog.actions'
import { mutateUpdateLogs } from '@/app/hooks/useUpdateLogs'
import type { UpdateLogAdminDetail } from '@/server/domains/updateLog'
import { toast } from '@/app/utils/toast'
import { applyEmphasisShortcut, emphasisKindForKey } from '@/app/utils/markdownEmphasis'
import { indentLines } from '@/app/utils/markdownIndent'
import { headingLevelForKey, setHeading } from '@/app/utils/markdownHeading'
import { applyTextareaEdit } from '@/app/utils/textareaEdit'
import { cn } from '@/lib/utils'

interface Fields {
    version: string
    title: string
    releasedAt: string
    body: string
}

type Pending = { kind: 'leave'; href: string } | { kind: 'unpublish' } | null

function today(): string {
    return new Date().toLocaleDateString('en-CA')
}

function toFields(log: UpdateLogAdminDetail | null): Fields {
    if (!log) return { version: '', title: '', releasedAt: today(), body: '' }
    return { version: log.version, title: log.title ?? '', releasedAt: log.released_at, body: log.body }
}

function sameFields(a: Fields, b: Fields): boolean {
    return a.version === b.version && a.title === b.title && a.releasedAt === b.releasedAt && a.body === b.body
}

interface Props {
    initial: UpdateLogAdminDetail | null
}

export default function UpdateLogEditor({ initial }: Props) {
    const router = useRouter()
    const [log, setLog] = useState<UpdateLogAdminDetail | null>(initial)
    const [baseline, setBaseline] = useState<Fields>(() => toFields(initial))
    const [draft, setDraft] = useState<Fields>(() => toFields(initial))
    const [saving, setSaving] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [pending, setPending] = useState<Pending>(null)
    const tabReleased = useRef(false)

    const dirty = useMemo(() => !sameFields(draft, baseline), [draft, baseline])
    const isPublished = !!log?.published_at

    const blockLeave = useCallback((href: string) => setPending({ kind: 'leave', href }), [])
    useLeaveGuard(dirty, blockLeave)

    function set<K extends keyof Fields>(key: K, value: Fields[K]) {
        setDraft(d => ({ ...d, [key]: value }))
    }

    function handleBodyKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.nativeEvent.isComposing) return
        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return

        if (e.key === 'Escape') {
            tabReleased.current = true
            return
        }
        if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (tabReleased.current) {
                tabReleased.current = false
                return
            }
            e.preventDefault()
            const el = e.currentTarget
            const edit = indentLines(el.value, el.selectionStart, el.selectionEnd, e.shiftKey ? 'out' : 'in')
            if (edit) applyTextareaEdit(el, edit, v => set('body', v))
            return
        }
        tabReleased.current = false

        const level = headingLevelForKey(e)
        if (level) {
            e.preventDefault()
            const el = e.currentTarget
            applyTextareaEdit(el, setHeading(el.value, el.selectionStart, el.selectionEnd, level), v => set('body', v))
            return
        }

        const kind = emphasisKindForKey(e)
        if (!kind) return
        e.preventDefault()
        applyEmphasisShortcut(e.currentTarget, kind, v => set('body', v))
    }

    async function handleSave() {
        setSaving(true)
        try {
            const fd = new FormData()
            fd.set('version', draft.version)
            fd.set('title', draft.title)
            fd.set('releasedAt', draft.releasedAt)
            fd.set('body', draft.body)
            if (log) fd.set('updateLogId', log.id)

            const result = log ? await updateUpdateLogAction(fd) : await createUpdateLogAction(fd)
            if (!result.ok) { toast.error(result.error.message); return }

            const saved = toFields(result.value)
            setLog(result.value)
            setBaseline(saved)
            setDraft(saved)
            toast.success(log ? 'Saved' : 'Draft created')
            await mutateUpdateLogs()
            if (!log) router.replace(`/admin/updates/${result.value.id}`)
        } finally {
            setSaving(false)
        }
    }

    async function setPublished(published: boolean) {
        if (!log) return
        setPublishing(true)
        try {
            const result = await setUpdateLogPublishedAction({ updateLogId: log.id, published })
            if (!result.ok) { toast.error(result.error.message); return }
            setLog(result.value)
            toast.success(published ? `Published ${result.value.version}` : `Unpublished ${result.value.version}`)
            await mutateUpdateLogs()
        } finally {
            setPublishing(false)
            setPending(null)
        }
    }

    function confirmLeave() {
        if (pending?.kind !== 'leave') return
        const href = pending.href
        setDraft(baseline)
        setPending(null)
        router.push(href)
    }

    const publishBlockedReason = !log
        ? 'Save the log first'
        : dirty
            ? 'Save or discard your changes first'
            : null

    return (
        <div className="admin-container">
            <div className="admin-section flex flex-col min-h-[calc(100vh-8rem)]">
                <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border">
                    <Button asChild variant="ghost" size="sm" className="rounded-sm text-muted-foreground -ml-2">
                        <Link href="/admin/updates"><ChevronLeft className="h-4 w-4" /> Updates</Link>
                    </Button>
                    <h1 className="text-xl font-semibold tracking-tight">
                        {log ? <span className="font-mono">{log.version}</span> : 'New update log'}
                    </h1>
                    {log && (
                        <Badge variant="outline" className={cn('rounded-sm text-xs uppercase',
                            isPublished ? 'text-muted-foreground' : 'text-secondary border-secondary/40')}>
                            {isPublished ? 'Published' : 'Draft'}
                        </Badge>
                    )}
                    <div className="flex-1" />
                    {isPublished && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-sm text-muted-foreground"
                            onClick={() => setPending({ kind: 'unpublish' })}
                            disabled={publishing}
                        >
                            Unpublish
                        </Button>
                    )}
                    {!isPublished && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span tabIndex={publishBlockedReason ? 0 : -1}>
                                        <Button
                                            size="sm"
                                            className="rounded-sm"
                                            onClick={() => setPublished(true)}
                                            disabled={publishing || !!publishBlockedReason}
                                        >
                                            {publishing ? 'Publishing…' : 'Publish'}
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                {publishBlockedReason && (
                                    <TooltipContent side="bottom" align="end">{publishBlockedReason}</TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

                {isPublished && (
                    <p className="text-sm text-muted-foreground pt-3">
                        Published. Saving updates the public page.
                    </p>
                )}

                <div className="grid gap-4 pt-4 sm:grid-cols-[10rem_1fr_11rem]">
                    <div className="space-y-1">
                        <Label htmlFor="update-version">Version</Label>
                        <Input
                            id="update-version"
                            value={draft.version}
                            onChange={e => set('version', e.target.value)}
                            placeholder="1.4.2"
                            className="rounded-sm font-mono"
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="update-title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Input
                            id="update-title"
                            value={draft.title}
                            onChange={e => set('title', e.target.value)}
                            placeholder="Serve rework"
                            className="rounded-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="update-released">Released</Label>
                        <Input
                            id="update-released"
                            type="date"
                            value={draft.releasedAt}
                            onChange={e => set('releasedAt', e.target.value)}
                            className="rounded-sm font-mono tabular-nums"
                        />
                    </div>
                </div>

                <div className="flex flex-col flex-1 pt-4 space-y-1">
                    <Label htmlFor="update-body">Body</Label>
                    <textarea
                        id="update-body"
                        value={draft.body}
                        onChange={e => set('body', e.target.value)}
                        onKeyDown={handleBodyKeyDown}
                        className="flex-1 min-h-[55vh] w-full resize-y rounded-sm border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Paste the patch notes here."
                    />
                    <p className="text-xs text-muted-foreground">
                        Text before the first <code className="font-mono">#</code> is the overview.{' '}
                        <code className="font-mono"># Section</code>, <code className="font-mono">## Category</code>,{' '}
                        <code className="font-mono">### Feature</code>. Start a line with <code className="font-mono">&gt;</code> to make it
                        collapsible, for example <code className="font-mono">&gt; ### Feature</code>. It ends at the first empty line.
                        Start any line or heading with <code className="font-mono">[buff]</code> or <code className="font-mono">[nerf]</code> for a ▲/▼ marker.
                        Ctrl+Alt+1/2/3 headings, Ctrl+B bold, Ctrl+I italic, Tab / Shift+Tab to nest list items (Esc then Tab to leave the box).
                    </p>
                </div>

                {dirty && (
                    <div className="sticky bottom-0 mt-4 flex items-center gap-2 px-5 py-2.5 border-t border-border bg-card">
                        <span className="text-sm text-muted-foreground">
                            {log ? 'Unsaved changes' : 'Not saved yet'}
                            {isPublished && ' · saving updates the public page'}
                        </span>
                        <span className="flex-1" />
                        <Button size="sm" variant="ghost" className="rounded-sm" onClick={() => setDraft(baseline)} disabled={saving}>
                            Discard
                        </Button>
                        <Button size="sm" className="rounded-sm" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : log ? 'Save' : 'Save draft'}
                        </Button>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={pending?.kind === 'leave'}
                title="Discard unsaved changes?"
                description="Your edits to this update log have not been saved."
                cancelLabel="Keep editing"
                confirmLabel="Discard and leave"
                destructive
                onCancel={() => setPending(null)}
                onConfirm={confirmLeave}
            />
            <ConfirmDialog
                open={pending?.kind === 'unpublish'}
                title={`Remove ${log?.version ?? ''} from the public page?`}
                description="The log stays saved. Publish again any time."
                cancelLabel="Cancel"
                confirmLabel={publishing ? 'Unpublishing…' : 'Unpublish'}
                destructive
                busy={publishing}
                onCancel={() => setPending(null)}
                onConfirm={() => setPublished(false)}
            />
        </div>
    )
}
