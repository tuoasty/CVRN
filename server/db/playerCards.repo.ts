import { CardGroupRow, CardTemplateRow, DBClient, PlayerCardInsert, PlayerCardRow } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'

export async function findCardGroups(supabase: DBClient): Promise<Result<CardGroupRow[]>> {
    const { data, error } = await supabase
        .from('card_groups')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as CardGroupRow[])
}

export async function findCardGroupById(supabase: DBClient, groupId: string): Promise<Result<CardGroupRow | null>> {
    const { data, error } = await supabase
        .from('card_groups')
        .select('*')
        .eq('id', groupId)
        .maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as CardGroupRow | null)
}

export async function findCardTemplates(supabase: DBClient, groupId?: string): Promise<Result<CardTemplateRow[]>> {
    let query = supabase.from('card_templates').select('*')
    if (groupId) query = query.eq('group_id', groupId)
    const { data, error } = await query.order('tier', { ascending: true })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as CardTemplateRow[])
}

export async function findPlayerCards(supabase: DBClient, p: { playerId: string; seasonNumber: number }): Promise<Result<PlayerCardRow[]>> {
    const { data, error } = await supabase
        .from('player_cards')
        .select('*')
        .eq('player_id', p.playerId)
        .eq('season_number', p.seasonNumber)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as PlayerCardRow[])
}

export async function findPlayerCard(
    supabase: DBClient,
    p: { playerId: string; seasonNumber: number; groupId: string },
): Promise<Result<PlayerCardRow | null>> {
    const { data, error } = await supabase
        .from('player_cards')
        .select('*')
        .eq('player_id', p.playerId)
        .eq('season_number', p.seasonNumber)
        .eq('group_id', p.groupId)
        .maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as PlayerCardRow | null)
}

export async function upsertPlayerCard(supabase: DBClient, row: PlayerCardInsert): Promise<Result<PlayerCardRow>> {
    const { data, error } = await supabase
        .from('player_cards')
        .upsert(row, { onConflict: 'player_id,season_number,group_id' })
        .select('*')
        .single()
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
    return Ok(data as PlayerCardRow)
}
