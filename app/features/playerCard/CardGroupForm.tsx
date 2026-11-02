'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { useIsSuperAdmin } from '@/app/admin/AdminRoleProvider'
import { createCardGroup, deleteCardGroup, updateCardGroup } from '@/app/hooks/usePlayerCard'
import { toast } from '@/app/utils/toast'
import type { CardGroup } from '@/server/domains/playerCard'
import { cn } from '@/lib/utils'
import ConfirmDeleteLink from './ConfirmDeleteLink'
import { FIELD_INPUT, FIELD_LABEL, LINK, NUMBER_INPUT, OPTION, OPTION_OFF, OPTION_ON, toInt } from './cardFormStyles'

function defaultCopySource(groups: CardGroup[]): string | null {
    const copyable = groups.filter(g => !g.layersProblem)
    return (copyable.find(g => g.name.trim().toLowerCase() === 'base') ?? copyable[0])?.id ?? null
}

export default function CardGroupForm({ group, groups, nextSortOrder, onDone, onCancel }: {
    group: CardGroup | null
    groups: CardGroup[]
    nextSortOrder: number
    onDone: () => void
    onCancel: () => void
}) {
    const isSuperAdmin = useIsSuperAdmin()
    const [name, setName] = useState(group?.name ?? '')
    const [sortOrder, setSortOrder] = useState(String(group?.sortOrder ?? nextSortOrder))
    const [isActive, setIsActive] = useState(group?.isActive ?? true)
    const [width, setWidth] = useState(String(group?.width ?? 1000))
    const [height, setHeight] = useState(String(group?.height ?? 1400))
    const [sourceGroupId, setSourceGroupId] = useState(() => defaultCopySource(groups))
    const [saving, setSaving] = useState(false)

    const source = groups.find(g => g.id === sourceGroupId) ?? null
    const needsSource = !group && groups.length > 0 && !source

    async function handleSave() {
        setSaving(true)
        try {
            const fields = { name, sortOrder: toInt(sortOrder), isActive }
            const result = group
                ? await updateCardGroup({ groupId: group.id, ...fields, width: toInt(width), height: toInt(height) })
                : await createCardGroup({ ...fields, sourceGroupId: source?.id ?? null })
            if (!result.ok) {
                toast.error(group ? 'Failed to save group' : 'Failed to create group', result.error.message)
                return
            }
            toast.success(group ? `Saved ${name.trim()}` : `Created ${name.trim()}`)
            onDone()
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete() {
        if (!group) return false
        const result = await deleteCardGroup(group.id)
        if (!result.ok) {
            toast.error(`Failed to delete ${group.name}`, result.error.message)
            return false
        }
        toast.success(`Deleted ${group.name}`)
        onDone()
        return true
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <label className="flex w-56 flex-col gap-1">
                    <span className={FIELD_LABEL}>Name</span>
                    <Input value={name} maxLength={40} onChange={e => setName(e.target.value)} className={FIELD_INPUT} autoFocus={!group} />
                </label>
                <label className="flex w-20 flex-col gap-1">
                    <span className={FIELD_LABEL}>Order</span>
                    <Input type="number" step={1} value={sortOrder} onChange={e => setSortOrder(e.target.value)} className={NUMBER_INPUT} />
                </label>
                {group ? (
                    <div className="flex flex-col gap-1">
                        <span className={FIELD_LABEL}>Canvas</span>
                        <div className="flex items-center gap-1.5">
                            <Input type="number" min={100} max={4000} step={1} value={width} onChange={e => setWidth(e.target.value)} aria-label="Canvas width" className={cn(NUMBER_INPUT, 'w-20')} />
                            <span className="text-sm text-muted-foreground">×</span>
                            <Input type="number" min={100} max={4000} step={1} value={height} onChange={e => setHeight(e.target.value)} aria-label="Canvas height" className={cn(NUMBER_INPUT, 'w-20')} />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        <span className={FIELD_LABEL}>Canvas</span>
                        <span className="flex h-8 items-center font-mono text-sm tabular-nums text-foreground">
                            {source?.width ?? 1000} × {source?.height ?? 1400}
                        </span>
                    </div>
                )}
                <label className="flex h-8 cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                    Active
                </label>
            </div>
            {!group && groups.length > 0 && (
                <div className="flex flex-col gap-1">
                    <span className={FIELD_LABEL}>Copy from</span>
                    <div className="flex flex-wrap items-end gap-x-4 gap-y-1" role="radiogroup" aria-label="Copy from">
                        {groups.map(g => (
                            <button
                                key={g.id}
                                type="button"
                                role="radio"
                                aria-checked={g.id === source?.id}
                                disabled={!!g.layersProblem}
                                title={g.layersProblem ?? undefined}
                                onClick={() => setSourceGroupId(g.id)}
                                className={cn(OPTION, g.id === source?.id ? OPTION_ON : OPTION_OFF, 'disabled:opacity-40')}
                            >
                                {g.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <p className="text-xs text-muted-foreground">
                {group
                    ? 'Canvas is the pixel size of the art and the layout, shared by every tier in the group. Layout boxes are in canvas pixels, so changing it does not rescale them.'
                    : source
                        ? `Copies the full layout and canvas from ${source.name}. Tiers, floors and art are not copied, so add those to the new group.`
                        : 'This is the first group, so it starts with an empty layout.'}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button size="sm" className="h-8 rounded-sm" onClick={handleSave} disabled={saving || name.trim() === '' || needsSource}>
                    {saving ? 'Saving…' : group ? 'Save group' : 'Create group'}
                </Button>
                <button type="button" className={LINK} onClick={onCancel}>Cancel</button>
                {needsSource && <span className="text-xs text-destructive">No group has a valid layout to copy.</span>}
                {group && isSuperAdmin && (
                    <span className="ml-auto">
                        <ConfirmDeleteLink
                            label="Delete group"
                            title={`Delete ${group.name}?`}
                            description="Only a group with no tiers can be deleted. This cannot be undone."
                            onConfirm={handleDelete}
                        />
                    </span>
                )}
            </div>
        </div>
    )
}
