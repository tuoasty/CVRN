'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { useIsSuperAdmin } from '@/app/admin/AdminRoleProvider'
import { createCardTierWithArt, deleteCardTemplate, updateCardTemplate } from '@/app/hooks/usePlayerCard'
import { toast } from '@/app/utils/toast'
import type { CardGroup, CardTemplateSummary } from '@/server/domains/playerCard'
import { layoutArtSlots } from './cardArt'
import CardTierArt, { CardTierArtPicker } from './CardTierArt'
import ConfirmDeleteLink from './ConfirmDeleteLink'
import { FIELD_INPUT, FIELD_LABEL, LINK, NUMBER_INPUT, toInt } from './cardFormStyles'

export default function CardTierForm({ group, template, onSaved, onDeleted, onCancel }: {
    group: CardGroup
    template: CardTemplateSummary | null
    onSaved: (templateId: string) => void
    onDeleted: () => void
    onCancel: () => void
}) {
    const isSuperAdmin = useIsSuperAdmin()
    const [name, setName] = useState(template?.name ?? '')
    const [floor, setFloor] = useState(template ? String(template.minOvr) : group.templates.length === 0 ? '1' : '')
    const [files, setFiles] = useState<Record<string, File>>({})
    const [saving, setSaving] = useState(false)

    const slots = layoutArtSlots(group.layers ?? [])
    const artReady = slots.length > 0 && slots.every(slot => files[slot.name])
    const blocked = saving || name.trim() === '' || (!template && !artReady)

    async function saveExisting(existing: CardTemplateSummary) {
        const result = await updateCardTemplate({ templateId: existing.id, name, minOvr: toInt(floor) })
        if (!result.ok) {
            toast.error('Failed to save tier', result.error.message)
            return
        }
        toast.success(`Saved ${name.trim()}`)
        onSaved(existing.id)
    }

    async function createWithArt() {
        const result = await createCardTierWithArt(
            { groupId: group.id, name, minOvr: toInt(floor) },
            slots.map(slot => ({ name: slot.name, file: files[slot.name] })),
        )
        if (!result.ok) {
            toast.error('Failed to add tier', result.error.message)
            return
        }
        const { templateId, failed } = result.value
        if (failed.length > 0) {
            toast.error(`${name.trim()} added, but ${failed.map(f => f.name).join(', ')} did not upload`, failed[0].message)
        } else {
            toast.success(`Added ${name.trim()} to ${group.name}`)
        }
        onSaved(templateId)
    }

    async function handleSave() {
        setSaving(true)
        try {
            await (template ? saveExisting(template) : createWithArt())
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete() {
        if (!template) return false
        const result = await deleteCardTemplate(template.id)
        if (!result.ok) {
            toast.error(`Failed to delete ${template.name}`, result.error.message)
            return false
        }
        toast.success(`Deleted ${template.name}`)
        onDeleted()
        return true
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <label className="flex w-56 flex-col gap-1">
                    <span className={FIELD_LABEL}>Name</span>
                    <Input value={name} maxLength={40} onChange={e => setName(e.target.value)} className={FIELD_INPUT} autoFocus={!template} />
                </label>
                <label className="flex w-20 flex-col gap-1">
                    <span className={FIELD_LABEL}>Floor</span>
                    <Input type="number" min={1} max={99} step={1} value={floor} onChange={e => setFloor(e.target.value)} className={NUMBER_INPUT} />
                </label>
            </div>

            {template
                ? <CardTierArt group={group} template={template} />
                : <CardTierArtPicker group={group} files={files} onChange={setFiles} />}

            <p className="text-xs text-muted-foreground">
                The floor is the lowest OVR that gets this tier. Tiers rank by floor, highest first, and every group needs a tier at floor 1. All tiers share the {group.name} layout and differ only by their art.
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button size="sm" className="h-8 rounded-sm" onClick={handleSave} disabled={blocked}>
                    {saving ? 'Saving…' : template ? 'Save tier' : 'Add tier'}
                </Button>
                <button type="button" className={LINK} onClick={onCancel}>Cancel</button>
                {!template && !artReady && slots.length > 0 && (
                    <span className="text-xs text-muted-foreground">Choose the art to add this tier</span>
                )}
                {template && isSuperAdmin && (
                    <span className="ml-auto">
                        <ConfirmDeleteLink
                            label="Delete tier"
                            title={`Delete ${template.name}?`}
                            description="Removes the tier and its art files. Blocked while generated cards use it. This cannot be undone."
                            onConfirm={handleDelete}
                        />
                    </span>
                )}
            </div>
        </div>
    )
}
