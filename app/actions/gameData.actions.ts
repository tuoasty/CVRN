"use server"

import { Err, Result } from '@/shared/types/result'
import { createServerSupabase } from '@/server/supabase/server'
import { requireAdmin } from '@/server/domains/auth'
import { previewGameDataImport, GameDataTextSchema, GameDataPreview } from '@/server/domains/gameData'

export async function previewGameDataImportAction(input: { text: string }): Promise<Result<GameDataPreview>> {
    const parsed = GameDataTextSchema.safeParse(input)
    if (!parsed.success) return Err({ message: parsed.error.issues.map(i => i.message).join(', '), code: 'VALIDATION_ERROR' })

    const supabase = await createServerSupabase()
    const guard = await requireAdmin(supabase)
    if (!guard.ok) return guard

    return previewGameDataImport(parsed.data.text)
}
