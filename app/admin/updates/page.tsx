"use client"

import { useState } from 'react'
import Link from 'next/link'
import { ScrollText, Trash2, Plus, Pencil, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import ConfirmDialog from '@/app/features/spec/catalog/ConfirmDialog'
import { useAdminUpdateLogs, mutateUpdateLogs } from '@/app/hooks/useUpdateLogs'
import { deleteUpdateLogAction, setUpdateLogPublishedAction } from '@/app/actions/updateLog.actions'
import type { UpdateLogListItem } from '@/server/domains/updateLog'
import { toast } from '@/app/utils/toast'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'published' | 'draft'
const FILTER_OPTIONS: FilterType[] = ['all', 'published', 'draft']

type Pending = { kind: 'delete' | 'unpublish'; log: UpdateLogListItem } | null

function formatReleased(date: string): string {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
        timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric',
    })
}

export default function AdminUpdatesPage() {
    const { logs, isLoading } = useAdminUpdateLogs()
    const [pending, setPending] = useState<Pending>(null)
    const [busy, setBusy] = useState<string | null>(null)
    const [filter, setFilter] = useState<FilterType>('all')

    const filtered = logs.filter(l =>
        filter === 'all' ? true : filter === 'published' ? !!l.published_at : !l.published_at
    )

    async function setPublished(log: UpdateLogListItem, published: boolean) {
        setBusy(log.id)
        try {
            const result = await setUpdateLogPublishedAction({ updateLogId: log.id, published })
            if (!result.ok) { toast.error(result.error.message); return }
            toast.success(published ? `Published ${log.version}` : `Unpublished ${log.version}`)
            await mutateUpdateLogs()
        } finally {
            setBusy(null)
            setPending(null)
        }
    }

    async function confirmDelete(log: UpdateLogListItem) {
        setBusy(log.id)
        try {
            const result = await deleteUpdateLogAction({ updateLogId: log.id })
            if (!result.ok) { toast.error(result.error.message); return }
            toast.success(`Deleted ${log.version}`)
            await mutateUpdateLogs()
        } finally {
            setBusy(null)
            setPending(null)
        }
    }

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <ScrollText className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">Updates</h1>
                        <p className="text-sm text-muted-foreground mt-1">Game update logs and patch notes</p>
                    </div>
                    <Button asChild size="sm" className="rounded-sm gap-1">
                        <Link href="/admin/updates/new"><Plus className="h-4 w-4" /> New Update</Link>
                    </Button>
                </div>

                <div className="flex gap-1.5 flex-wrap mt-4">
                    {FILTER_OPTIONS.map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={cn(
                                'rounded-sm px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors',
                                filter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                        {logs.length === 0 ? 'No update logs yet.' : `No ${filter} update logs.`}
                    </p>
                ) : (
                    <div className="mt-4 space-y-2">
                        {filtered.map(l => (
                            <div key={l.id} className={cn(
                                'flex items-center gap-3 p-3 rounded-sm border transition-colors',
                                l.published_at ? 'border-border bg-card hover:bg-muted/30' : 'border-secondary/20 bg-secondary/5 hover:bg-secondary/10',
                            )}>
                                <span className="w-24 flex-shrink-0 font-mono text-sm font-semibold truncate">{l.version}</span>
                                <div className="flex-1 min-w-0">
                                    <p className={cn('text-sm truncate', l.title ? 'font-medium' : 'text-muted-foreground')}>
                                        {l.title || 'Untitled'}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        Released <span className="font-mono tabular-nums">{formatReleased(l.released_at)}</span>
                                    </p>
                                </div>
                                <Badge variant="outline" className={cn('rounded-sm text-xs uppercase',
                                    l.published_at ? 'text-muted-foreground' : 'text-secondary border-secondary/40')}>
                                    {l.published_at ? 'Published' : 'Draft'}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-sm text-muted-foreground hover:bg-muted"
                                    disabled={busy === l.id}
                                    onClick={() => l.published_at ? setPending({ kind: 'unpublish', log: l }) : setPublished(l, true)}
                                    title={l.published_at ? 'Unpublish' : 'Publish'}
                                >
                                    {l.published_at ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-sm text-muted-foreground hover:bg-muted" title="Edit">
                                    <Link href={`/admin/updates/${l.id}`}><Pencil className="h-4 w-4" /></Link>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-sm text-destructive hover:bg-destructive/10"
                                    disabled={busy === l.id}
                                    onClick={() => setPending({ kind: 'delete', log: l })}
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={pending?.kind === 'unpublish'}
                title={`Remove ${pending?.log.version ?? ''} from the public page?`}
                description="The log stays saved. Publish again any time."
                cancelLabel="Cancel"
                confirmLabel={busy ? 'Unpublishing…' : 'Unpublish'}
                destructive
                busy={!!busy}
                onCancel={() => setPending(null)}
                onConfirm={() => pending && setPublished(pending.log, false)}
            />
            <ConfirmDialog
                open={pending?.kind === 'delete'}
                title={`Delete ${pending?.log.version ?? ''}?`}
                description="The update log and its images will be permanently deleted. This cannot be undone."
                cancelLabel="Cancel"
                confirmLabel={busy ? 'Deleting…' : 'Delete'}
                destructive
                busy={!!busy}
                onCancel={() => setPending(null)}
                onConfirm={() => pending && confirmDelete(pending.log)}
            />
        </div>
    )
}
