"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react'
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
    uploadUpdateLogImageAction,
    updateUpdateLogImagesAction,
} from '@/app/actions/updateLog.actions'
import { mutateUpdateLogs } from '@/app/hooks/useUpdateLogs'
import type { UpdateLogAdminDetail, UpdateLogAdminImage } from '@/server/domains/updateLog'
import { toast } from '@/app/utils/toast'
import { applyEmphasisShortcut, emphasisKindForKey } from '@/app/utils/markdownEmphasis'
import { indentLines } from '@/app/utils/markdownIndent'
import { headingLevelForKey, setHeading } from '@/app/utils/markdownHeading'
import { applyTextareaEdit } from '@/app/utils/textareaEdit'
import { cn } from '@/lib/utils'
import { compressImage } from '@/app/utils/imageCompression'
import ArticleEditorModeToggle, { type EditorMode } from '@/app/features/articles/ArticleEditorModeToggle'
import ChangelogBody from '@/app/features/updates/changelog/ChangelogBody'
import {
    IMAGE_MAX_BYTES,
    referencedImageNames,
    renameImageTokens,
    slugImageName,
    uniqueImageName,
} from '@/shared/utils/imageTokens'
import { diffImages, fromSavedImage, imagesDirty, renameError, tokenInsertEdit, type EditorImage } from './editorImages'
import UpdateLogImagesPanel from './UpdateLogImagesPanel'

interface Fields {
    version: string
    title: string
    releasedAt: string
    body: string
}

type Pending =
    | { kind: 'leave'; href: string }
    | { kind: 'unpublish' }
    | { kind: 'removeImage'; key: string; name: string; uses: number }
    | null

function today(): string {
    return new Date().toLocaleDateString('en-CA')
}

function toFields(log: UpdateLogAdminDetail | null): Fields {
    if (!log) return { version: '', title: '', releasedAt: today(), body: '' }
    return { version: log.version, title: log.title ?? '', releasedAt: log.released_at, body: log.body }
}

function fieldsFormData(fields: Fields, updateLogId?: string): FormData {
    const fd = new FormData()
    fd.set('version', fields.version)
    fd.set('title', fields.title)
    fd.set('releasedAt', fields.releasedAt)
    fd.set('body', fields.body)
    if (updateLogId) fd.set('updateLogId', updateLogId)
    return fd
}

function revokePending(images: EditorImage[]) {
    for (const image of images) if (image.file) URL.revokeObjectURL(image.url)
}

function sameFields(a: Fields, b: Fields): boolean {
    return a.version === b.version && a.title === b.title && a.releasedAt === b.releasedAt && a.body === b.body
}

interface Props {
    initial: UpdateLogAdminDetail | null
    initialImages?: UpdateLogAdminImage[]
}

export default function UpdateLogEditor({ initial, initialImages = [] }: Props) {
    const router = useRouter()
    const [log, setLog] = useState<UpdateLogAdminDetail | null>(initial)
    const [baseline, setBaseline] = useState<Fields>(() => toFields(initial))
    const [draft, setDraft] = useState<Fields>(() => toFields(initial))
    const [saving, setSaving] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [pending, setPending] = useState<Pending>(null)
    const [images, setImages] = useState<EditorImage[]>(() => initialImages.map(fromSavedImage))
    const [savedImages, setSavedImages] = useState<EditorImage[]>(() => initialImages.map(fromSavedImage))
    const [processingCount, setProcessingCount] = useState(0)
    const [mode, setMode] = useState<EditorMode>('edit')
    const tabReleased = useRef(false)
    const bodyRef = useRef<HTMLTextAreaElement>(null)
    const pendingSeq = useRef(0)
    const imagesRef = useRef(images)
    const reservedNames = useRef(new Set<string>())
    const processing = processingCount > 0

    useEffect(() => {
        imagesRef.current = images
    }, [images])

    useEffect(() => () => revokePending(imagesRef.current), [])

    const uses = useMemo(() => referencedImageNames(draft.body), [draft.body])
    const missing = useMemo(() => {
        const attached = new Set(images.map(image => image.name))
        return [...uses.entries()].filter(([name]) => !attached.has(name))
    }, [uses, images])

    const dirty = useMemo(
        () => !sameFields(draft, baseline) || imagesDirty(images, savedImages),
        [draft, baseline, images, savedImages],
    )
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

    function insertTokens(names: string[]) {
        const el = bodyRef.current
        if (!el || names.length === 0) return
        applyTextareaEdit(el, tokenInsertEdit(el.value, el.selectionStart, el.selectionEnd, names), v => set('body', v))
    }

    async function addFiles(files: File[]) {
        const candidates = files.filter(file => file.type.startsWith('image/'))
        if (candidates.length === 0) return
        const taken = new Set([...imagesRef.current.map(image => image.name), ...reservedNames.current])
        const planned = candidates.map(file => {
            const name = uniqueImageName(slugImageName(file.name), taken)
            taken.add(name)
            reservedNames.current.add(name)
            return { file, name }
        })
        setProcessingCount(c => c + 1)
        const added: EditorImage[] = []
        try {
            for (const { file, name } of planned) {
                try {
                    const compressed = await compressImage(file, { maxDimension: 1920 })
                    if (compressed.size > IMAGE_MAX_BYTES) {
                        toast.error(`${file.name} is still over 2 MB after compression`)
                        continue
                    }
                    pendingSeq.current += 1
                    added.push({
                        key:     `pending-${pendingSeq.current}`,
                        id:      null,
                        name,
                        caption: '',
                        url:     URL.createObjectURL(compressed),
                        file:    compressed,
                    })
                } catch {
                    toast.error(`Could not read ${file.name}`)
                }
            }
        } finally {
            setProcessingCount(c => c - 1)
        }
        imagesRef.current = [...imagesRef.current, ...added]
        for (const { name } of planned) reservedNames.current.delete(name)
        if (added.length === 0) return
        setImages(prev => [...prev, ...added])
        insertTokens(added.map(image => image.name))
    }

    function handleBodyPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
        const files = Array.from(e.clipboardData.files).filter(file => file.type.startsWith('image/'))
        if (files.length === 0) return
        e.preventDefault()
        void addFiles(files)
    }

    function handleBodyDragOver(e: DragEvent<HTMLTextAreaElement>) {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault()
    }

    function handleBodyDrop(e: DragEvent<HTMLTextAreaElement>) {
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
        if (files.length > 0) {
            e.preventDefault()
            void addFiles(files)
            return
        }
        if (/<img\b/i.test(e.dataTransfer.getData('text/html'))) {
            e.preventDefault()
            toast.error('Save the image and drop the file instead. Image links expire.')
        }
    }

    function renameImage(key: string, raw: string): string | null {
        const image = images.find(i => i.key === key)
        if (!image) return null
        const name = raw.trim().toLowerCase()
        if (name === image.name) return null
        const problem = renameError(raw, key, images)
        if (problem) return problem
        setImages(prev => prev.map(i => (i.key === key ? { ...i, name } : i)))
        set('body', renameImageTokens(draft.body, image.name, name))
        return null
    }

    function setCaption(key: string, caption: string) {
        setImages(prev => prev.map(i => (i.key === key ? { ...i, caption } : i)))
    }

    function removeImage(key: string) {
        const image = images.find(i => i.key === key)
        if (!image) return
        if (image.file) URL.revokeObjectURL(image.url)
        setImages(prev => prev.filter(i => i.key !== key))
    }

    function requestRemove(key: string) {
        const image = images.find(i => i.key === key)
        if (!image) return
        const count = uses.get(image.name) ?? 0
        if (count > 0) setPending({ kind: 'removeImage', key, name: image.name, uses: count })
        else removeImage(key)
    }

    function discard() {
        revokePending(images.filter(image => !image.id))
        setDraft(baseline)
        setImages(savedImages)
    }

    async function handleSave() {
        setSaving(true)
        const submitted = draft
        const submittedImages = images
        try {
            let current = log
            if (!current || !sameFields(submitted, baseline)) {
                const res = current
                    ? await updateUpdateLogAction(fieldsFormData(submitted, current.id))
                    : await createUpdateLogAction(fieldsFormData(submitted))
                if (!res.ok) { toast.error(res.error.message); return }
                if (!current) window.history.replaceState(null, '', `/admin/updates/${res.value.id}`)
                current = res.value
                setLog(res.value)
                const savedFields = toFields(res.value)
                setBaseline(savedFields)
                setDraft(d => (sameFields(d, submitted) ? savedFields : d))
            }

            const { changes, removedIds, pending: toUpload } = diffImages(submittedImages, savedImages)
            let saved = savedImages
            if (changes.length > 0 || removedIds.length > 0) {
                const res = await updateUpdateLogImagesAction({ updateLogId: current.id, changes, removedIds })
                if (!res.ok) { toast.error(res.error.message); return }
                saved = res.value.map(fromSavedImage)
            }

            const uploaded = new Map<string, EditorImage>()
            let failure: string | null = null
            for (const image of toUpload) {
                const fd = new FormData()
                fd.set('updateLogId', current.id)
                fd.set('name', image.name)
                fd.set('caption', image.caption)
                fd.set('file', image.file!)
                const res = await uploadUpdateLogImageAction(fd)
                if (res.ok) {
                    URL.revokeObjectURL(image.url)
                    uploaded.set(image.key, fromSavedImage(res.value))
                } else {
                    failure ??= `${image.name}: ${res.error.message}`
                }
            }
            saved = [...saved, ...uploaded.values()]
            setSavedImages(saved)
            setImages(prev => [...saved, ...prev.filter(image => !image.id && !uploaded.has(image.key))])

            if (failure) toast.error(`Some images did not upload. ${failure}`)
            else toast.success(log ? 'Saved' : 'Draft created')
            await mutateUpdateLogs()
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
        discard()
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

                <div className="grid flex-1 gap-6 pt-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="flex min-w-0 flex-col space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="update-body">Body</Label>
                            <ArticleEditorModeToggle mode={mode} onChange={setMode} />
                        </div>
                        <textarea
                            ref={bodyRef}
                            id="update-body"
                            value={draft.body}
                            onChange={e => set('body', e.target.value)}
                            onKeyDown={handleBodyKeyDown}
                            onPaste={handleBodyPaste}
                            onDragOver={handleBodyDragOver}
                            onDrop={handleBodyDrop}
                            className={cn(
                                'flex-1 min-h-[55vh] w-full resize-y rounded-sm border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                                mode === 'preview' && 'hidden',
                            )}
                            placeholder="Paste the patch notes here. Paste or drop screenshots to attach them."
                        />
                        {mode === 'preview' && (
                            <div className="min-h-[55vh] flex-1 overflow-auto rounded-sm border border-border bg-background px-6 py-5">
                                {draft.body.trim()
                                    ? <ChangelogBody body={draft.body} images={images.map(i => ({ name: i.name, url: i.url, caption: i.caption.trim() || null }))} />
                                    : <p className="py-16 text-center text-sm text-muted-foreground">Nothing to preview yet.</p>}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Text before the first <code className="font-mono">#</code> is the overview.{' '}
                            <code className="font-mono"># Section</code>, <code className="font-mono">## Category</code>,{' '}
                            <code className="font-mono">### Feature</code>. Put <code className="font-mono">&gt;</code> at the very start of a heading line to make it
                            collapsible, for example <code className="font-mono">&gt; ### Feature</code>. It ends at the first empty line.
                            Start any line or heading with <code className="font-mono">[buff]</code>, <code className="font-mono">[nerf]</code> or <code className="font-mono">[rework]</code> for a ▲/▼/~ marker (it replaces the bullet in lists),
                            or <code className="font-mono">[new]</code> to label it NEW.
                            Put <code className="font-mono">[image:name]</code> on its own line to show an image; add <code className="font-mono">:left</code> or <code className="font-mono">:right</code> and <code className="font-mono">:25</code>, <code className="font-mono">:50</code> or <code className="font-mono">:75</code> to float it.
                            Ctrl+Alt+1/2/3 headings, Ctrl+B bold, Ctrl+I italic, Tab / Shift+Tab to nest list items (Esc then Tab to leave the box).
                        </p>
                    </div>

                    <UpdateLogImagesPanel
                        images={images}
                        uses={uses}
                        missing={missing}
                        processing={processing}
                        locked={saving}
                        onAddFiles={files => void addFiles(files)}
                        onRename={renameImage}
                        onCaption={setCaption}
                        onInsert={name => insertTokens([name])}
                        onRemove={requestRemove}
                    />
                </div>

                {dirty && (
                    <div className="sticky bottom-0 mt-4 flex items-center gap-2 px-5 py-2.5 border-t border-border bg-card">
                        <span className="text-sm text-muted-foreground">
                            {log ? 'Unsaved changes' : 'Not saved yet'}
                            {isPublished && ' · saving updates the public page'}
                        </span>
                        <span className="flex-1" />
                        <Button size="sm" variant="ghost" className="rounded-sm" onClick={discard} disabled={saving}>
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
                open={pending?.kind === 'removeImage'}
                title={pending?.kind === 'removeImage' ? `Remove ${pending.name}?` : ''}
                description={pending?.kind === 'removeImage'
                    ? `It is used ${pending.uses} ${pending.uses === 1 ? 'time' : 'times'} in the body. Those tokens stay and show as missing until you attach an image named ${pending.name} again. The file is deleted when you save.`
                    : ''}
                cancelLabel="Keep image"
                confirmLabel="Remove"
                destructive
                onCancel={() => setPending(null)}
                onConfirm={() => {
                    if (pending?.kind === 'removeImage') removeImage(pending.key)
                    setPending(null)
                }}
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
