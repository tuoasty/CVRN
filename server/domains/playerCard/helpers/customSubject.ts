import { Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { findPlayerByRobloxId } from '@/server/db/players.repo'
import { findPlayerSeasonRosters, PlayerSeasonRoster } from '@/server/db/playerCards.repo'
import { CardSubject, CustomCardPlayer } from '../types'

export function pickSeasonRoster(rows: PlayerSeasonRoster[]): PlayerSeasonRoster | null {
    return [...rows].sort((a, b) =>
        Number(a.left_at !== null) - Number(b.left_at !== null) || b.joined_at.localeCompare(a.joined_at)
    )[0] ?? null
}

export function trustedRobloxAvatarUrl(url: string | null): string | null {
    if (!url) return null
    try {
        const { protocol, hostname } = new URL(url)
        return protocol === 'https:' && /(^|\.)rbxcdn\.com$/i.test(hostname) ? url : null
    } catch {
        return null
    }
}

export async function resolveCustomSubject(
    supabase: DBClient,
    p: { player: CustomCardPlayer; seasonNumber: number; regionCode: string | null },
): Promise<Result<CardSubject>> {
    const noTeam = { teamId: null, teamName: null, teamLogoUrl: null }

    const found = await findPlayerByRobloxId(supabase, p.player.robloxUserId)
    if (!found.ok) return found
    if (!found.value) {
        return Ok({ ...p.player, avatarUrl: trustedRobloxAvatarUrl(p.player.avatarUrl), playerId: null, regionCode: p.regionCode, ...noTeam })
    }

    const identity = {
        playerId: found.value.id,
        robloxUserId: p.player.robloxUserId,
        username: found.value.username ?? p.player.username,
        displayName: found.value.display_name,
        avatarUrl: found.value.avatar_url,
    }

    const rosters = await findPlayerSeasonRosters(supabase, { playerId: found.value.id, seasonNumber: p.seasonNumber })
    if (!rosters.ok) return rosters
    const roster = pickSeasonRoster(rosters.value)
    if (!roster) return Ok({ ...identity, regionCode: p.regionCode, ...noTeam })

    const team = roster.team && !roster.team.deleted_at ? roster.team : null
    return Ok({
        ...identity,
        regionCode: roster.season?.region?.code ?? p.regionCode,
        teamId: team?.id ?? null,
        teamName: team?.name ?? null,
        teamLogoUrl: team?.logo_url ?? null,
    })
}
