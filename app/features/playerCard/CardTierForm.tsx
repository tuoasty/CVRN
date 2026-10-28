'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { useIsSuperAdmin } from '@/app/admin/AdminRoleProvider'
import { createCardTemplate, deleteCardTemplate, updateCardTemplate } from '@/app/hooks/usePlayerCard'
import { toast } from '@/app/utils/toast'
import type { CardGroup, CardTemplateSummary } from '@/server/domains/playerCard'
import ConfirmDeleteLink from './ConfirmDeleteLink'
import { FIELD_INPUT, FIELD_LABEL, LINK, NUMBER_INPUT, toInt } from './cardFormStyles'

async function copyFolder(templateId: string) {
    try {
        await navigator.clipboard.writeText(`card-templates/${templateId}/`)
        toast.success('Copied art folder path')
    } catch {
        toast.error('Copy failed', 'Select the path and copy it manually')
    }
}

function layoutArtFiles(group: CardGroup): string[] {
    return [...new Set((group.layers ?? []).flatMap(l => (l.kind === 'art' && !l.src.includes('/') ? [l.src] : [])))]
}

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
    const [saving, setSaving] = useState(false)
    const artFiles = layoutArtFiles(group)

    async function handleSave() {
        setSaving(true)
        try {
            const fields = { name, minOvr: toInt(floor) }
            const result = template
                ? await updateCardTemplate({ templateId: template.id, ...fields })
                : await createCardTemplate({ groupId: group.id, ...fields })
            if (!result.ok) {
                toast.error(template ? 'Failed to save tier' : 'Failed to add tier', result.error.message)
                return
            }
            toast.success(template ? `Saved ${name.trim()}` : `Added ${name.trim()} to ${group.name}`)
            onSaved(result.value?.id ?? template?.id ?? '')
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

            {template && (
                <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className={FIELD_LABEL}>Art folder</span>
                        <span className="break-all font-mono text-xs text-foreground">card-templates/{template.id}/</span>
                        <button type="button" className={LINK} onClick={() => copyFolder(template.id)}>Copy</button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {artFiles.length > 0
                            ? <>The {group.name} layout expects <span className="font-mono text-foreground">{artFiles.join(', ')}</span> in this folder.</>
                            : `The ${group.name} layout has no art layers yet.`}
                    </p>
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                The floor is the lowest OVR that gets this tier. Tiers rank by floor, highest first, and every group needs a tier at floor 1. All tiers share the {group.name} layout and differ only by their art files.
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button size="sm" className="h-8 rounded-sm" onClick={handleSave} disabled={saving || name.trim() === ''}>
                    {saving ? 'Saving…' : template ? 'Save tier' : 'Add tier'}
                </Button>
                <button type="button" className={LINK} onClick={onCancel}>Cancel</button>
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
