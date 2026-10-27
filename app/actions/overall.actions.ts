"use server"

import { Err, Ok, Result } from '@/shared/types/result'
import { createServerSupabase } from '@/server/supabase/server'
import { serializeError } from '@/server/utils/serializeableError'
import { requireAdmin } from '@/server/domains/auth'
import {
    getOverallConfig,
    saveOverallScalings,
    copyOverallScalings,
    setOverallOverride,
    clearOverallOverride,
    SeasonIdSchema,
    SaveOverallScalingsSchema,
    CopyOverallScalingsSchema,
    SetOverallOverrideSchema,
    ClearOverallOverrideSchema,
} from '@/server/domains/overall'
import type { OverallBoard, OverallConfig } from '@/server/domains/overall'
import { getCachedSeasonOverallInputs } from '@/server/cache/publicReads'

export async function getOverallBoardAction(seasonId: string): Promise<Result<OverallBoard>> {
    const parsed = SeasonIdSchema.safeParse({ seasonId })
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    try {
        const [players, config] = await Promise.all([
            getCachedSeasonOverallInputs(parsed.data.seasonId),
            getOverallConfig(supabase, parsed.data.seasonId),
        ])
        if (!config.ok) return config
        return Ok({ players, config: config.value })
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function saveOverallScalingsAction(input: unknown): Promise<Result<OverallConfig>> {
    const parsed = SaveOverallScalingsSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return saveOverallScalings(supabase, parsed.data)
}

export async function copyOverallScalingsAction(input: unknown): Promise<Result<OverallConfig>> {
    const parsed = CopyOverallScalingsSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return copyOverallScalings(supabase, parsed.data)
}

export async function setOverallOverrideAction(input: unknown): Promise<Result<OverallConfig>> {
    const parsed = SetOverallOverrideSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return setOverallOverride(supabase, parsed.data)
}

export async function clearOverallOverrideAction(input: unknown): Promise<Result<OverallConfig>> {
    const parsed = ClearOverallOverrideSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return clearOverallOverride(supabase, parsed.data)
}
