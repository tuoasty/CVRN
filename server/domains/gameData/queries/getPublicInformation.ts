import { DBClient } from '@/shared/types/db'
import { Ok, Result } from '@/shared/types/result'
import { buildPublicInformation } from '../helpers/public/buildPublicInformation'
import type { PublicInformation } from '../types/publicInformation'
import { getGameDatasetPayloads } from './getStoredGameDatasets'
import { getGameTerms } from './getGameTerms'
import { getGameAbilitySettings } from './getGameAbilitySettings'

export async function getPublicInformation(supabase: DBClient): Promise<Result<PublicInformation>> {
    const [payloads, terms, settings] = await Promise.all([
        getGameDatasetPayloads(supabase),
        getGameTerms(supabase),
        getGameAbilitySettings(supabase),
    ])
    if (!payloads.ok) return payloads
    if (!terms.ok) return terms
    if (!settings.ok) return settings
    return Ok(buildPublicInformation({ payloads: payloads.value, terms: terms.value, settings: settings.value }))
}
