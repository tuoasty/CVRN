import { DBClient } from '@/shared/types/db'
import { Ok, Result } from '@/shared/types/result'
import { findSpecCatalog } from '@/server/db/specs.repo'
import { findSkippedSpecKeys } from '@/server/db/gameSpecSkip.repo'
import type { LinkSpec } from '../types'

export async function getLinkSpecs(supabase: DBClient): Promise<Result<LinkSpec[]>> {
    const specs = await findSpecCatalog(supabase)
    if (!specs.ok) return specs
    return Ok(specs.value.map(s => ({ id: s.id, name: s.name, stars: s.stars, position: s.position, height: s.height, game_key: s.game_key })))
}

export async function getSkippedSpecKeys(supabase: DBClient): Promise<Result<Set<string>>> {
    const keys = await findSkippedSpecKeys(supabase)
    if (!keys.ok) return keys
    return Ok(new Set(keys.value))
}
