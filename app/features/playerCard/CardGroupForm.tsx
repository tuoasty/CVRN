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
import { FIELD_INPUT, FIELD_LABEL, LINK, NUMBER_INPUT, toInt } from './cardFormStyles'

export default function CardGroupForm({ group, nextSortOrder, onDone, onCancel }: {
    group: CardGroup | null
    nextSortOrder: number
    onDone: () => void
    onCancel: () => void
}) {
    const isSuperAdmin = useIsSuperAdmin()
    const [name, setName] = useState(group?.name ?? '')
    const [sortOrder, setSortOrder] = useState(String(group?.sortOrder ?? nextSortOrder))
    const [isLimited, setIsLimited] = useState(group?.isLimited ?? false)
    const [isActive, setIsActive] = useState(group?.isActive ?? true)
    const [width, setWidth] = useState(String(group?.width ?? 1000))
    const [height, setHeight] = useState(String(group?.height ?? 1400))
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        try {
            const fields = { name, sortOrder: toInt(sortOrder), isLimited, isActive, width: toInt(width), height: toInt(height) }
            const result = group ? await updateCardGroup({ groupId: group.id, ...fields }) : await createCardGroup(fields)
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
                <div className="flex flex-col gap-1">
                    <span className={FIELD_LABEL}>Canvas</span>
                    <div className="flex items-center gap-1.5">
                        <Input type="number" min={100} max={4000} step={1} value={width} onChange={e => setWidth(e.target.value)} aria-label="Canvas width" className={cn(NUMBER_INPUT, 'w-20')} />
                        <span className="text-sm text-muted-foreground">×</span>
                        <Input type="number" min={100} max={4000} step={1} value={height} onChange={e => setHeight(e.target.value)} aria-label="Canvas height" className={cn(NUMBER_INPUT, 'w-20')} />
                    </div>
                </div>
                <label className="flex h-8 cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={isLimited} onChange={e => setIsLimited(e.target.checked)} />
                    Limited
                </label>
                <label className="flex h-8 cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                    Active
                </label>
            </div>
            <p className="text-xs text-muted-foreground">
                Canvas is the pixel size of the art and the layout, shared by every tier in the group. Layout boxes are in canvas pixels, so changing it does not rescale them.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button size="sm" className="h-8 rounded-sm" onClick={handleSave} disabled={saving || name.trim() === ''}>
                    {saving ? 'Saving…' : group ? 'Save group' : 'Create group'}
                </Button>
                <button type="button" className={LINK} onClick={onCancel}>Cancel</button>
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
