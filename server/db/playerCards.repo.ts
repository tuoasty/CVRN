import { CardGroupInsert, CardGroupRow, CardTemplateInsert, CardTemplateRow, DBClient, PlayerCardInsert, PlayerCardOverlayInsert, PlayerCardOverlayRow, PlayerCardRow } from '@/shared/types/db'
import type { Json } from '@/database.types'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'
import type { CardAttributes } from '@/server/domains/playerCard/types'

type PgError = { code?: string; message: string }

function writeError(error: PgError, conflictMessage: string) {
    if (error.code === '23505' || error.code === '23503') return { message: conflictMessage, code: 'CONFLICT' as const }
    return serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR')
}

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
    const { data, error } = await query.order('min_ovr', { ascending: false })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as CardTemplateRow[])
}

const CARD_ATTRIBUTES_PAGE_SIZE = 1000

export async function findCardAttributesBySeason(supabase: DBClient, seasonNumber: number): Promise<Result<CardAttributes[]>> {
    const out: CardAttributes[] = []
    for (let from = 0; ; from += CARD_ATTRIBUTES_PAGE_SIZE) {
        const { data, error } = await supabase
            .from('player_cards')
            .select('id, player_id, season_number, ovr, scoring, spiking, setting, blocking, receiving, serving')
            .eq('season_number', seasonNumber)
            .order('id', { ascending: true })
            .range(from, from + CARD_ATTRIBUTES_PAGE_SIZE - 1)
        if (error) return Err(serializeError(error, 'DB_ERROR'))
        for (const r of data ?? []) {
            out.push({
                playerId: r.player_id,
                seasonNumber: r.season_number,
                ovr: r.ovr,
                scoring: r.scoring,
                spiking: r.spiking,
                setting: r.setting,
                blocking: r.blocking,
                receiving: r.receiving,
                serving: r.serving,
            })
        }
        if (!data || data.length < CARD_ATTRIBUTES_PAGE_SIZE) return Ok(out)
    }
}

export interface PublicPlayerCardRow {
    season_number: number
    group_id: string
    ovr: number
    image_url: string
    group: { name: string; sort_order: number; canvas_width: number; canvas_height: number }
    team: { name: string } | null
}

export async function findPublicPlayerCards(supabase: DBClient, p: { playerId: string }): Promise<Result<PublicPlayerCardRow[]>> {
    const { data, error } = await supabase
        .from('player_cards')
        .select('season_number, group_id, ovr, image_url, group:card_groups!group_id(name, sort_order, canvas_width, canvas_height), team:teams!team_id(name)')
        .eq('player_id', p.playerId)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as unknown as PublicPlayerCardRow[])
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

export async function findPlayerIdsWithCards(
    supabase: DBClient,
    p: { seasonNumber: number; groupId: string },
): Promise<Result<string[]>> {
    const { data, error } = await supabase
        .from('player_cards')
        .select('player_id')
        .eq('season_number', p.seasonNumber)
        .eq('group_id', p.groupId)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []).map(row => row.player_id))
}

export interface PlayerSeasonRoster {
    left_at: string | null
    joined_at: string
    team: { id: string; name: string; logo_url: string | null; deleted_at: string | null } | null
    season: { region: { code: string } | null } | null
}

export async function findPlayerSeasonRosters(
    supabase: DBClient,
    p: { playerId: string; seasonNumber: number },
): Promise<Result<PlayerSeasonRoster[]>> {
    const { data, error } = await supabase
        .from('player_team_seasons')
        .select('left_at, joined_at, team:teams!team_id(id, name, logo_url, deleted_at), season:seasons!season_id!inner(region:regions!region_id(code))')
        .eq('player_id', p.playerId)
        .eq('season.season_number', p.seasonNumber)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as unknown as PlayerSeasonRoster[])
}

export async function deletePlayerCard(
    supabase: DBClient,
    p: { playerId: string; seasonNumber: number; groupId: string },
): Promise<Result<PlayerCardRow | null>> {
    const { data, error } = await supabase
        .from('player_cards')
        .delete()
        .eq('player_id', p.playerId)
        .eq('season_number', p.seasonNumber)
        .eq('group_id', p.groupId)
        .select('*')
        .maybeSingle()
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
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

interface PlayerCardOverlayKey {
    playerId: string
    seasonNumber: number
    groupId: string
    slot: 'rig'
}

export async function findPlayerCardOverlay(supabase: DBClient, p: PlayerCardOverlayKey): Promise<Result<PlayerCardOverlayRow | null>> {
    const { data, error } = await supabase
        .from('player_card_overlays')
        .select('*')
        .eq('player_id', p.playerId)
        .eq('season_number', p.seasonNumber)
        .eq('group_id', p.groupId)
        .eq('slot', p.slot)
        .maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as PlayerCardOverlayRow | null)
}

export async function upsertPlayerCardOverlay(supabase: DBClient, row: PlayerCardOverlayInsert): Promise<Result<PlayerCardOverlayRow>> {
    const { data, error } = await supabase
        .from('player_card_overlays')
        .upsert(row, { onConflict: 'player_id,season_number,group_id,slot' })
        .select('*')
        .single()
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
    return Ok(data as PlayerCardOverlayRow)
}

export async function updatePlayerCardOverlayPlacement(
    supabase: DBClient,
    p: PlayerCardOverlayKey & {
        placement: { imageX: number; imageY: number; imageW: number }
    },
): Promise<Result<PlayerCardOverlayRow | null>> {
    const { data, error } = await supabase
        .from('player_card_overlays')
        .update({
            image_x: p.placement.imageX,
            image_y: p.placement.imageY,
            image_w: p.placement.imageW,
        })
        .eq('player_id', p.playerId)
        .eq('season_number', p.seasonNumber)
        .eq('group_id', p.groupId)
        .eq('slot', p.slot)
        .select('*')
        .maybeSingle()
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
    return Ok(data as PlayerCardOverlayRow | null)
}

export async function deletePlayerCardOverlay(supabase: DBClient, p: PlayerCardOverlayKey): Promise<Result<PlayerCardOverlayRow | null>> {
    const { data, error } = await supabase
        .from('player_card_overlays')
        .delete()
        .eq('player_id', p.playerId)
        .eq('season_number', p.seasonNumber)
        .eq('group_id', p.groupId)
        .eq('slot', p.slot)
        .select('*')
        .maybeSingle()
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
    return Ok(data as PlayerCardOverlayRow | null)
}

export async function findCardTemplateById(supabase: DBClient, templateId: string): Promise<Result<CardTemplateRow | null>> {
    const { data, error } = await supabase
        .from('card_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as CardTemplateRow | null)
}

export async function updateCardGroupLayers(supabase: DBClient, p: { groupId: string; layers: Json }): Promise<Result<CardGroupRow>> {
    const { data, error } = await supabase
        .from('card_groups')
        .update({ layers: p.layers })
        .eq('id', p.groupId)
        .select('*')
        .maybeSingle()
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
    if (!data) return Err({ message: 'Card group not found or not editable', code: 'NOT_FOUND' })
    return Ok(data as CardGroupRow)
}

export async function insertCardGroup(supabase: DBClient, row: CardGroupInsert): Promise<Result<CardGroupRow>> {
    const { data, error } = await supabase.from('card_groups').insert(row).select('*').single()
    if (error) return Err(writeError(error, 'Card group could not be created'))
    return Ok(data as CardGroupRow)
}

export async function updateCardGroup(
    supabase: DBClient,
    p: { groupId: string; patch: Partial<CardGroupInsert> },
): Promise<Result<CardGroupRow>> {
    const { data, error } = await supabase.from('card_groups').update(p.patch).eq('id', p.groupId).select('*').maybeSingle()
    if (error) return Err(writeError(error, 'Card group could not be updated'))
    if (!data) return Err({ message: 'Card group not found or not editable', code: 'NOT_FOUND' })
    return Ok(data as CardGroupRow)
}

export async function deleteCardGroup(supabase: DBClient, groupId: string): Promise<Result<null>> {
    const { data, error } = await supabase.from('card_groups').delete().eq('id', groupId).select('id')
    if (error) return Err(writeError(error, 'Card group still has tiers, generated cards or rigs'))
    if (!data || data.length === 0) return Err({ message: 'Card group not found or not deletable', code: 'NOT_FOUND' })
    return Ok(null)
}

export async function insertCardTemplate(supabase: DBClient, row: CardTemplateInsert): Promise<Result<CardTemplateRow>> {
    const { data, error } = await supabase.from('card_templates').insert(row).select('*').single()
    if (error) return Err(writeError(error, `Another tier in this group already starts at OVR ${row.min_ovr}`))
    return Ok(data as CardTemplateRow)
}

export async function updateCardTemplate(
    supabase: DBClient,
    p: { templateId: string; patch: Pick<CardTemplateInsert, 'name' | 'min_ovr'> },
): Promise<Result<CardTemplateRow>> {
    const { data, error } = await supabase.from('card_templates').update(p.patch).eq('id', p.templateId).select('*').maybeSingle()
    if (error) return Err(writeError(error, `Another tier in this group already starts at OVR ${p.patch.min_ovr}`))
    if (!data) return Err({ message: 'Card template not found or not editable', code: 'NOT_FOUND' })
    return Ok(data as CardTemplateRow)
}

export async function deleteCardTemplate(supabase: DBClient, templateId: string): Promise<Result<null>> {
    const { data, error } = await supabase.from('card_templates').delete().eq('id', templateId).select('id')
    if (error) return Err(writeError(error, 'Generated cards still use this tier'))
    if (!data || data.length === 0) return Err({ message: 'Card template not found or not deletable', code: 'NOT_FOUND' })
    return Ok(null)
}

export async function countTemplatesByGroup(supabase: DBClient, groupId: string): Promise<Result<number>> {
    const { count, error } = await supabase.from('card_templates').select('id', { count: 'exact', head: true }).eq('group_id', groupId)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(count ?? 0)
}

export async function countPlayerCardsByTemplate(supabase: DBClient, templateId: string): Promise<Result<number>> {
    const { count, error } = await supabase.from('player_cards').select('id', { count: 'exact', head: true }).eq('template_id', templateId)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(count ?? 0)
}
