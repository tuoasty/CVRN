import { Err, Ok, Result } from '@/shared/types/result'
import { CardGroupInsert, DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findCardGroupById, findCardGroups, insertCardGroup } from '@/server/db/playerCards.repo'
import { CreateCardGroupInput } from '../types'
import { copyableLayers } from '../helpers/toCardShapes'

type CopiedTemplate = Pick<CardGroupInsert, 'layers' | 'canvas_width' | 'canvas_height'>

async function resolveCopiedTemplate(supabase: DBClient, sourceGroupId: string | null): Promise<Result<CopiedTemplate>> {
    if (sourceGroupId === null) {
        const groups = await findCardGroups(supabase)
        if (!groups.ok) return groups
        if (groups.value.length > 0) return Err({ message: 'Choose a group to copy from', code: 'VALIDATION_ERROR' })
        return Ok({})
    }

    const source = await findCardGroupById(supabase, sourceGroupId)
    if (!source.ok) return source
    if (!source.value) return Err({ message: 'The group to copy from no longer exists', code: 'NOT_FOUND' })

    const layers = copyableLayers(source.value)
    if (!layers.ok) return layers
    return Ok({ layers: layers.value, canvas_width: source.value.canvas_width, canvas_height: source.value.canvas_height })
}

export async function createCardGroup(supabase: DBClient, p: CreateCardGroupInput): Promise<Result<{ id: string }>> {
    try {
        const template = await resolveCopiedTemplate(supabase, p.sourceGroupId)
        if (!template.ok) return template

        const saved = await insertCardGroup(supabase, {
            name: p.name,
            is_active: p.isActive,
            sort_order: p.sortOrder,
            ...template.value,
        })
        if (!saved.ok) return saved
        return Ok({ id: saved.value.id })
    } catch (error) {
        return Err(serializeError(error))
    }
}
