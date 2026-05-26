import {DBClient, MatchSheetConfig} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {readSheetRange} from "@/server/utils/googleSheets";
import {findMatchById} from "@/server/db/matches.repo";
import {findTeamsBySeasonId} from "@/server/db/teams.repo";
import {findTeamNameHistoryByTeamIds} from "@/server/db/teamNameHistory.repo";
import {findPlayersByUsernames} from "@/server/db/players.repo";
import {getRobloxUserByName} from "@/server/roblox/users";
import {parseMatchSet} from "../helpers/parseMatchSet";
import {resolveTeamNames} from "../helpers/resolveTeamNames";
import {StatCounts, SyncError} from "../types";

// One row to insert into player_match_stats. Shape matches the DB column names
// so we can pass the array straight into the replace_match_player_stats RPC as
// jsonb and let jsonb_populate_recordset map it.
export type PlayerMatchStatsInsert = {
    match_id: string;
    player_id: string;
    team_id: string;
    set_number: number;
} & StatCounts;

export interface MatchStatsPlan {
    matchId: string;
    rows: PlayerMatchStatsInsert[];
    summary: {
        sets: number;
        rowCount: number;
        teams: { name: string; playerCount: number }[];
    };
    errors: SyncError[];
}

// Validate-first pipeline. Reads the sheet, parses every set tab, resolves
// players + teams. NEVER writes. Returns the plan (rows ready to insert) plus
// any errors. Caller decides whether to commit (only if errors.length === 0).
export async function buildMatchStatsPlan(
    supabase: DBClient,
    config: MatchSheetConfig
): Promise<Result<MatchStatsPlan>> {
    // ---- 1. Load match + both teams ----
    const matchResult = await findMatchById(supabase, config.match_id);
    if (!matchResult.ok) return matchResult;
    if (!matchResult.value) return Err({message: "Match not found", code: "NOT_FOUND"});
    const match = matchResult.value;

    if (!match.home_team_id || !match.away_team_id) {
        return Err({message: "Match has no home or away team", code: "VALIDATION_ERROR"});
    }
    const teamIds = [match.home_team_id, match.away_team_id];

    // ---- 2. Build team-name → team-id map (current + historical names) ----
    const teamRes = await findTeamsBySeasonId(supabase, match.season_id);
    if (!teamRes.ok) return teamRes;
    const teams = teamRes.value.filter(t => teamIds.includes(t.id));

    const histRes = await findTeamNameHistoryByTeamIds(supabase, teamIds);
    if (!histRes.ok) return histRes;

    const nameMap = resolveTeamNames(teams, histRes.value); // keys: lowercase+trim
    const teamNames = new Set(nameMap.keys());

    // ---- 3. Read + parse each set tab ----
    const N = (match.home_sets_won ?? 0) + (match.away_sets_won ?? 0);
    if (N === 0) {
        return Err({message: "Match has no completed sets", code: "VALIDATION_ERROR"});
    }

    type AccumulatedLine = {
        username: string;
        teamName: string;        // normalized (matches nameMap keys)
        setNumber: number;
        rowNumber: number;
        counts: StatCounts;
    };
    const allLines: AccumulatedLine[] = [];
    const errors: SyncError[] = [];

    // Read all set tabs in parallel — N sequential Google Sheets round-trips
    // was the main slowness. Each tab is independent so Promise.all is safe.
    const tabReads = await Promise.all(
        Array.from({length: N}, (_, i) => {
            const tabName = `SET ${i + 1}`;
            const setNumber = i + 1;
            return readSheetRange(config.sheet_id, tabName)
                .then(raw => ({
                    tabName,
                    setNumber,
                    // googleapis types cells as `any`; coerce to strings for the parser.
                    rows: (raw ?? []).map(r => r.map(c => (c == null ? "" : String(c)))),
                    error: null as string | null,
                }))
                .catch(() => ({
                    tabName,
                    setNumber,
                    rows: [] as string[][],
                    error: "could not read sheet tab" as string | null,
                }));
        })
    );

    for (const tab of tabReads) {
        if (tab.error) {
            errors.push({row: 0, message: `[${tab.tabName}] ${tab.error}`});
            continue;
        }
        const {lines, errors: tabErrors} = parseMatchSet(tab.rows, teamNames, tab.setNumber);
        for (const err of tabErrors) {
            errors.push({row: err.row, message: `[${tab.tabName}] ${err.message}`});
        }
        for (const line of lines) allLines.push(line);
    }

    // ---- 4. Resolve usernames → player_id ----
    // Two-pass: (a) batch DB lookup against the sheet's literal usernames;
    // (b) for misses, ask Roblox for the canonical name (handles renames —
    // Roblox redirects old usernames to current), then batch-lookup those.
    // Mirrors the rename detection in syncTeamRoster.ts.
    const uniqueUsernames = Array.from(new Set(allLines.map(l => l.username)));
    const playerIdByName = new Map<string, string>();

    if (uniqueUsernames.length > 0) {
        // (a) Direct batch lookup.
        const directRes = await findPlayersByUsernames(supabase, uniqueUsernames);
        if (!directRes.ok) return directRes;
        const foundByLower = new Map(directRes.value.map(p => [p.username.toLowerCase(), p.id]));

        const unresolved: string[] = [];
        for (const username of uniqueUsernames) {
            const id = foundByLower.get(username.toLowerCase());
            if (id) {
                playerIdByName.set(username.toLowerCase(), id);
            } else {
                unresolved.push(username);
            }
        }

        // (b) Rename fallback — ask Roblox for the canonical name in parallel.
        if (unresolved.length > 0) {
            const robloxResults = await Promise.all(
                unresolved.map(u => getRobloxUserByName(u).then(r => ({sheetName: u, result: r})))
            );

            // Collect canonical names we haven't already loaded.
            const sheetToCanonical = new Map<string, string>(); // sheet name → Roblox canonical
            const canonicalsToLookup: string[] = [];
            for (const {sheetName, result} of robloxResults) {
                if (!result.ok || result.value.length === 0) {
                    errors.push({row: 0, message: `Unknown player "${sheetName}" — not found on Roblox`});
                    continue;
                }
                const canonical = result.value[0].name;
                sheetToCanonical.set(sheetName, canonical);
                if (!foundByLower.has(canonical.toLowerCase())) {
                    canonicalsToLookup.push(canonical);
                }
            }

            // One more batch DB lookup, only for canonicals we don't already have.
            if (canonicalsToLookup.length > 0) {
                const canonicalRes = await findPlayersByUsernames(supabase, canonicalsToLookup);
                if (!canonicalRes.ok) return canonicalRes;
                for (const p of canonicalRes.value) {
                    foundByLower.set(p.username.toLowerCase(), p.id);
                }
            }

            for (const [sheetName, canonical] of sheetToCanonical) {
                const id = foundByLower.get(canonical.toLowerCase());
                if (id) {
                    playerIdByName.set(sheetName.toLowerCase(), id);
                } else {
                    errors.push({
                        row: 0,
                        message: `Player "${sheetName}" (now "${canonical}" on Roblox) is not in our database — must be registered first`,
                    });
                }
            }
        }
    }

    // ---- 5. Build insert rows. Skip lines whose username didn't resolve
    //    (those already produced an error above). ----
    const insertRows: PlayerMatchStatsInsert[] = [];
    for (const line of allLines) {
        const playerId = playerIdByName.get(line.username.toLowerCase());
        const teamId = nameMap.get(line.teamName);
        if (!playerId || !teamId) continue;
        insertRows.push({
            match_id: match.id,
            player_id: playerId,
            team_id: teamId,
            set_number: line.setNumber,
            ...line.counts,
        });
    }

    // ---- 6. Summary by team (using each team's current display name) ----
    const playersByTeam = new Map<string, Set<string>>();
    for (const line of allLines) {
        if (!playersByTeam.has(line.teamName)) playersByTeam.set(line.teamName, new Set());
        playersByTeam.get(line.teamName)!.add(line.username);
    }
    const teamSummaries = Array.from(playersByTeam.entries()).map(([normalized, players]) => {
        const teamId = nameMap.get(normalized);
        const team = teams.find(t => t.id === teamId);
        return {name: team?.name ?? normalized, playerCount: players.size};
    });

    return Ok({
        matchId: match.id,
        rows: insertRows,
        summary: {
            sets: N,
            rowCount: insertRows.length,
            teams: teamSummaries,
        },
        errors,
    });
}
