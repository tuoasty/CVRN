import { DBClient } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { findGameTerm, upsertGameTerm, type GameTermWriteDto } from '@/server/db/gameTerm.repo'
import { getGameDatasetPayloads } from '../queries/getStoredGameDatasets'
import { toGameTerm } from '../helpers/toGameTerm'
import { normalizeTermDraft, validateTermDraft } from '../terms/termEdit'
import type { GameTerm } from '../terms/types'
import type { SaveGameTermInput } from '../types/schemas'

export function buildSaveTermRow(input: SaveGameTermInput, existing: { verified: boolean } | null, abilityKeys: ReadonlySet<string>, userId: string): Result<GameTermWriteDto> {
    const draft = normalizeTermDraft({ ...input, verified: existing?.verified ?? false })
    const errors = validateTermDraft(draft, abilityKeys)
    if (errors.length > 0) return Err({ message: errors.join('. '), code: 'VALIDATION_ERROR' })

    const wanted = draft.grants?.toLowerCase()
    const grants = wanted === undefined ? null : [...abilityKeys].find(key => key.toLowerCase() === wanted) ?? null
    return Ok({
        kind: draft.kind,
        tag: draft.tag,
        category: draft.category,
        label: draft.label,
        unit: draft.unit,
        template: draft.template,
        grants,
        verified: draft.verified,
        updated_by: userId,
    })
}

export async function saveGameTerm(supabase: DBClient, p: { input: SaveGameTermInput; userId: string }): Promise<Result<GameTerm>> {
    const [payloads, existing] = await Promise.all([
        getGameDatasetPayloads(supabase),
        findGameTerm(supabase, p.input.kind, p.input.tag),
    ])
    if (!payloads.ok) return payloads
    if (!existing.ok) return existing

    const keys = new Set((payloads.value.abilities ?? []).map(a => a.key))
    const row = buildSaveTermRow(p.input, existing.value, keys, p.userId)
    if (!row.ok) return row

    const saved = await upsertGameTerm(supabase, row.value)
    if (!saved.ok) return saved
    const term = toGameTerm(saved.value)
    return term ? Ok(term) : Err({ message: 'Saved term has an unknown kind', code: 'DB_ERROR' })
}
