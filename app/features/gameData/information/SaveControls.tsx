"use client"

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import type { TermChange } from '@/server/domains/gameData/terms/termEdit'
import SharedTagPreview from './SharedTagPreview'

interface SaveControlsProps {
    tags: string
    dirty: boolean
    blocked: boolean
    saving: boolean
    changes: TermChange[]
    editing: string | null
    onSave: () => void
    onCancel: () => void
}

export default function SaveControls({ tags, dirty, blocked, saving, changes, editing, onSave, onCancel }: SaveControlsProps) {
    const [confirming, setConfirming] = useState(false)
    const others = changes.filter(c => c.ability !== editing).length

    function save() {
        if (others > 0 && !confirming) { setConfirming(true); return }
        setConfirming(false)
        onSave()
    }

    if (confirming && dirty) {
        return (
            <div className="mt-3">
                <SharedTagPreview tag={tags} changes={changes} editing={editing} />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button size="sm" className="rounded-sm" disabled={blocked || saving} onClick={save}>
                        {saving ? 'Saving…' : `Save for all ${changes.length}`}
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-sm" onClick={() => setConfirming(false)}>Back</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" className="rounded-sm" disabled={!dirty || blocked || saving} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-sm" onClick={() => { setConfirming(false); onCancel() }}>Cancel</Button>
        </div>
    )
}
