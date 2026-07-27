import { describe, it, expect } from 'vitest'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { findActiveSheetConfigs } from '@/server/db/sheetConfig.repo'
import { readSheetRange } from '@/server/utils/googleSheets'
import { parseTeamsSheet } from '@/server/domains/sheets/helpers/parseTeamsSheet'

const VALID_ROLES = new Set(['captain', 'vice_captain', 'court_captain', 'player'])

describe('sheets integration', () => {
    it('active sheet_configs exist in DB', async () => {
        const result = await findActiveSheetConfigs(getSupabaseAdmin())
        expect(result.ok, result.ok ? '' : result.error.message).toBe(true)
        if (!result.ok) return
        expect(result.value.length).toBeGreaterThan(0)
    }, 15_000)

    it('reads and parses all active teams-type configs end-to-end', async () => {
        const result = await findActiveSheetConfigs(getSupabaseAdmin())
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const teamConfigs = result.value.filter(c => c.sheet_type === 'teams')
        expect(teamConfigs.length).toBeGreaterThan(0)

        for (const config of teamConfigs) {
            const rows = await readSheetRange(config.sheet_id, config.tab_name) as string[][]
            expect(rows.length, `config ${config.id}: sheet returned no rows`).toBeGreaterThan(0)

            const teams = parseTeamsSheet(
                rows,
                config.header_row ?? 9,
                config.block_height ?? 18,
                config.block_stride ?? 4,
            )

            expect(teams.length, `config ${config.id}: no teams parsed`).toBeGreaterThan(0)

            for (const team of teams) {
                expect(team.teamName).toBeTruthy()
                expect(team.teamNumber).toBeGreaterThan(0)
                expect(Array.isArray(team.players)).toBe(true)

                for (const player of team.players) {
                    expect(player.username, `team ${team.teamName}: empty username`).toBeTruthy()
                    expect(VALID_ROLES.has(player.role), `team ${team.teamName}: invalid role "${player.role}"`).toBe(true)
                    expect(player.rowNumber).toBeGreaterThan(0)
                }
            }
        }
    }, 30_000)
})
