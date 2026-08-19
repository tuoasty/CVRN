import {DBClient, MatchSheetConfig} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {readSheetRange, listSheetTitles} from "@/server/utils/googleSheets";
import {findMatchById} from "@/server/db/matches.repo";
import {findTeamsBySeasonId} from "@/server/db/teams.repo";
import {findTeamNameHistoryByTeamIds} from "@/server/db/teamNameHistory.repo";
import {
    findAllTeamPlayersForSeason,
    findPlayersByUsernames,
    findPlayerTeamSeasonsForTeams,
} from "@/server/db/players.repo";
import {getRobloxUserByName} from "@/server/roblox/users";
import {parseMatchSet} from "../helpers/parseMatchSet";
import {resolveTeamNames} from "../helpers/resolveTeamNames";
import {teamNameKey} from "@/server/domains/team/helpers/normalizeTeamName";
import {StatCounts, SyncError} from "../types";
import {PositionCode} from "@/shared/volleyball/positions";

export type PlayerMatchStatsInsert = {
    match_id: string;
    player_id: string;
    team_id: string;
    set_number: number;
    position: PositionCode | null;
} & StatCounts;

export interface MatchStatsPlan {
    matchId: string;
    rows: PlayerMatchStatsInsert[];
    summary: {
        sets: number;
        rowCount: number;
        teams: { name: string; playerCount: number }[];

        sections: {
            tabName: string;
            headerLabel: string;
            resolvedTeamName: string;
            votes: number;
            playerCount: number;
        }[];
    };

    skippedPlayers: string[];

    rosterCandidates: { playerId: string; username: string; teamName: string }[];
    errors: SyncError[];
}

export type PlayerOverrides = Record<string, string>;

export async function buildMatchStatsPlan(
    supabase: DBClient,
    config: MatchSheetConfig,
    opts?: {playerOverrides?: PlayerOverrides}
): Promise<Result<MatchStatsPlan>> {

    const matchResult = await findMatchById(supabase, config.match_id);
    if (!matchResult.ok) return matchResult;
    if (!matchResult.value) return Err({message: "Match not found", code: "NOT_FOUND"});
    const match = matchResult.value;

    if (!match.home_team_id || !match.away_team_id) {
        return Err({message: "Match has no home or away team", code: "VALIDATION_ERROR"});
    }
    const teamIds = [match.home_team_id, match.away_team_id];

    const teamRes = await findTeamsBySeasonId(supabase, match.season_id);
    if (!teamRes.ok) return teamRes;
    const teams = teamRes.value.filter(t => teamIds.includes(t.id));

    const histRes = await findTeamNameHistoryByTeamIds(supabase, teamIds);
    if (!histRes.ok) return histRes;

    const nameMap = resolveTeamNames(teams, histRes.value); 
    const teamNameOf = (id: string) => teams.find(t => t.id === id)?.name ?? id;

    const rosterResults = await Promise.all(
        teamIds.map(id => findAllTeamPlayersForSeason(supabase, id, match.season_id))
    );
    const rosterCandidates: MatchStatsPlan["rosterCandidates"] = [];
    for (const res of rosterResults) {
        if (!res.ok) return res;
        for (const pts of res.value) {
            if (!pts.player) continue;
            rosterCandidates.push({
                playerId: pts.player.id,
                username: pts.player.username,
                teamName: teamNameOf(pts.team_id),
            });
        }
    }
    const rosterPlayerIds = new Set(rosterCandidates.map(c => c.playerId));

    const overrides = new Map<string, string>(
        Object.entries(opts?.playerOverrides ?? {}).map(([k, v]) => [k.toLowerCase(), v])
    );

    const N = (match.home_sets_won ?? 0) + (match.away_sets_won ?? 0);
    if (N === 0) {
        return Err({message: "Match has no completed sets", code: "VALIDATION_ERROR"});
    }

    type AccumulatedLine = {
        username: string;
        sectionKey: string;
        setNumber: number;
        rowNumber: number;
        counts: StatCounts;
        position: PositionCode | null;
    };
    type SectionMeta = {
        key: string;
        tabName: string;
        headerLabel: string;
        playerCount: number;
    };

    const allLines: AccumulatedLine[] = [];
    const sectionMetas: SectionMeta[] = [];
    const errors: SyncError[] = [];
    const skippedPlayers: string[] = [];

    const sheetTitles = await listSheetTitles(config.sheet_id).catch(() => [] as string[]);
    const normalizeTab = (s: string) => s.replace(/[^a-z0-9]/gi, "").toUpperCase();
    const titleBySetKey = new Map(sheetTitles.map(t => [normalizeTab(t), t]));
    const resolveSetTab = (n: number) => titleBySetKey.get(`SET${n}`) ?? `SET ${n}`;

    const tabReads = await Promise.all(
        Array.from({length: N}, (_, i) => {
            const tabName = resolveSetTab(i + 1);
            const setNumber = i + 1;
            return readSheetRange(config.sheet_id, tabName)
                .then(raw => ({
                    tabName,
                    setNumber,

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
            errors.push({row: 0, message: `[${tab.tabName}] ${tab.error}`, kind: "fatal"});
            continue;
        }
        const {sections, errors: tabErrors} = parseMatchSet(tab.rows, tab.setNumber);
        for (const err of tabErrors) {
            errors.push({...err, message: `[${tab.tabName}] ${err.message}`});
        }

        if (tabErrors.length === 0 && sections.length !== 2) {
            const found = sections.length > 0
                ? ` (${sections.map(s => `"${s.headerLabel}"`).join(", ")})`
                : "";
            errors.push({
                row: 0,
                kind: "fatal",
                message: `[${tab.tabName}] expected 2 team sections, found ${sections.length}${found}. ` +
                    `A player row with no stat values is read as a team header.`,
            });
            continue;
        }

        for (const section of sections) {
            const key = `${tab.tabName}#${section.sectionIndex}`;
            sectionMetas.push({
                key,
                tabName: tab.tabName,
                headerLabel: section.headerLabel,
                playerCount: section.lines.length,
            });
            for (const line of section.lines) {
                allLines.push({...line, sectionKey: key});
            }
        }
    }

    const uniqueUsernames = Array.from(new Set(allLines.map(l => l.username)));
    const playerIdByName = new Map<string, string>();

    const toResolve: string[] = [];
    for (const username of uniqueUsernames) {
        const overrideId = overrides.get(username.toLowerCase());
        if (!overrideId) {
            toResolve.push(username);
            continue;
        }
        if (!rosterPlayerIds.has(overrideId)) {
            errors.push({
                row: 0,
                kind: "fatal",
                message: `Cannot map "${username}" to a player who is on neither team's roster this season`,
            });
            continue;
        }
        playerIdByName.set(username.toLowerCase(), overrideId);
    }

    if (toResolve.length > 0) {

        const directRes = await findPlayersByUsernames(supabase, toResolve);
        if (!directRes.ok) return directRes;
        const foundByLower = new Map(directRes.value.map(p => [p.username.toLowerCase(), p.id]));

        const unresolved: string[] = [];
        for (const username of toResolve) {
            const id = foundByLower.get(username.toLowerCase());
            if (id) {
                playerIdByName.set(username.toLowerCase(), id);
            } else {
                unresolved.push(username);
            }
        }

        if (unresolved.length > 0) {
            const robloxResults = await Promise.all(
                unresolved.map(u => getRobloxUserByName(u).then(r => ({sheetName: u, result: r})))
            );

            const sheetToCanonical = new Map<string, string>(); 
            const canonicalsToLookup: string[] = [];
            for (const {sheetName, result} of robloxResults) {
                if (!result.ok || result.value.length === 0) {
                    errors.push({
                        row: 0,
                        kind: "skippable",
                        message: `Unknown player "${sheetName}" — not found on Roblox`,
                    });
                    skippedPlayers.push(sheetName);
                    continue;
                }
                const canonical = result.value[0].name;
                sheetToCanonical.set(sheetName, canonical);
                if (!foundByLower.has(canonical.toLowerCase())) {
                    canonicalsToLookup.push(canonical);
                }
            }

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
                        kind: "skippable",
                        message: `Player "${sheetName}" (now "${canonical}" on Roblox) is not in our database — must be registered first`,
                    });
                    skippedPlayers.push(sheetName);
                }
            }
        }
    }

    const resolvedPlayerIds = Array.from(new Set(playerIdByName.values()));
    const ptsRes = await findPlayerTeamSeasonsForTeams(
        supabase, resolvedPlayerIds, teamIds, match.season_id
    );
    if (!ptsRes.ok) return ptsRes;

    const teamsByPlayer = new Map<string, string[]>();
    for (const {player_id, team_id} of ptsRes.value) {
        const list = teamsByPlayer.get(player_id) ?? [];
        list.push(team_id);
        teamsByPlayer.set(player_id, list);
    }

    const linesBySection = new Map<string, AccumulatedLine[]>();
    for (const line of allLines) {
        const list = linesBySection.get(line.sectionKey) ?? [];
        list.push(line);
        linesBySection.set(line.sectionKey, list);
    }

    const teamIdBySection = new Map<string, string>();
    const sectionSummaries: MatchStatsPlan["summary"]["sections"] = [];

    for (const meta of sectionMetas) {
        const lines = linesBySection.get(meta.key) ?? [];
        const votes = new Map<string, number>();
        for (const line of lines) {
            const pid = playerIdByName.get(line.username.toLowerCase());
            if (!pid) continue;
            for (const tid of teamsByPlayer.get(pid) ?? []) {
                votes.set(tid, (votes.get(tid) ?? 0) + 1);
            }
        }

        const ranked = Array.from(votes.entries()).sort((a, b) => b[1] - a[1]);
        const expectedTeamId = nameMap.get(teamNameKey(meta.headerLabel)) ?? null;

        let winner: string;
        let winnerVotes = 0;

        if (ranked.length === 0) {

            if (!expectedTeamId) {
                errors.push({
                    row: 0,
                    kind: "fatal",
                    message: `[${meta.tabName}] could not identify the team for section "${meta.headerLabel}" — ` +
                        `no player in it is on either roster this season, and the label matches no known team name`,
                });
                continue;
            }
            winner = expectedTeamId;
        } else if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) {
            errors.push({
                row: 0,
                kind: "fatal",
                message: `[${meta.tabName}] section "${meta.headerLabel}" is split evenly between both teams ` +
                    `(${ranked.map(([t, n]) => `${teamNameOf(t)}: ${n}`).join(", ")})`,
            });
            continue;
        } else {
            [winner, winnerVotes] = ranked[0];

            if (expectedTeamId && expectedTeamId !== winner) {
                errors.push({
                    row: 0,
                    kind: "fatal",
                    message: `[${meta.tabName}] section "${meta.headerLabel}" is labelled as one team but ` +
                        `${winnerVotes} of its players belong to "${teamNameOf(winner)}"`,
                });
                continue;
            }
        }

        teamIdBySection.set(meta.key, winner);
        sectionSummaries.push({
            tabName: meta.tabName,
            headerLabel: meta.headerLabel,
            resolvedTeamName: teamNameOf(winner),
            votes: winnerVotes,
            playerCount: meta.playerCount,
        });
    }

    const seenPerTab = new Map<string, Set<string>>();
    for (const meta of sectionMetas) {
        const tid = teamIdBySection.get(meta.key);
        if (!tid) continue;
        const seen = seenPerTab.get(meta.tabName) ?? new Set<string>();
        if (seen.has(tid)) {
            errors.push({
                row: 0,
                kind: "fatal",
                message: `[${meta.tabName}] both sections resolved to "${teamNameOf(tid)}"`,
            });
        }
        seen.add(tid);
        seenPerTab.set(meta.tabName, seen);
    }

    const insertRows: PlayerMatchStatsInsert[] = [];
    for (const line of allLines) {
        const playerId = playerIdByName.get(line.username.toLowerCase());
        const teamId = teamIdBySection.get(line.sectionKey);
        if (!playerId || !teamId) continue;
        insertRows.push({
            match_id: match.id,
            player_id: playerId,
            team_id: teamId,
            set_number: line.setNumber,
            position: line.position,
            ...line.counts,
        });
    }

    const seenPerSet = new Map<string, number>();
    for (const row of insertRows) {
        const key = `${row.set_number}#${row.player_id}`;
        seenPerSet.set(key, (seenPerSet.get(key) ?? 0) + 1);
    }
    for (const [key, count] of seenPerSet) {
        if (count < 2) continue;
        const [setNumber, playerId] = key.split("#");
        const username = rosterCandidates.find(c => c.playerId === playerId)?.username ?? playerId;
        errors.push({
            row: 0,
            kind: "fatal",
            message: `Player "${username}" appears ${count} times in set ${setNumber}. ` +
                `Check for a duplicate row, or an override mapping onto a name already in the sheet.`,
        });
    }

    const playersByTeam = new Map<string, Set<string>>();
    for (const line of allLines) {
        const teamId = teamIdBySection.get(line.sectionKey);
        if (!teamId) continue;
        if (!playersByTeam.has(teamId)) playersByTeam.set(teamId, new Set());
        playersByTeam.get(teamId)!.add(line.username);
    }
    const teamSummaries = Array.from(playersByTeam.entries()).map(([teamId, players]) => ({
        name: teamNameOf(teamId),
        playerCount: players.size,
    }));

    return Ok({
        matchId: match.id,
        rows: insertRows,
        summary: {
            sets: N,
            rowCount: insertRows.length,
            teams: teamSummaries,
            sections: sectionSummaries,
        },
        skippedPlayers: Array.from(new Set(skippedPlayers)),
        rosterCandidates,
        errors,
    });
}
