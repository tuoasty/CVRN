import {ParsedRosterEntry, ParsedTeamResult, PlayerRole} from "@/server/domains/sheets/types";

const TEAMS_PER_ROW = 5;
const PLAYER_ROWS = 16;

const ROLE_MAP: Record<string, PlayerRole> = {
    C: 'captain',
    VC: 'vice_captain',
    CC: 'court_captain',
};

export function parseTeamsSheet(
    rows: string[][],
    headerRow: number,
    blockHeight: number,
    blockStride: number = 4,
    bgColors?: (string | null)[][]
): ParsedTeamResult[] {
    const results: ParsedTeamResult[] = [];

    for (let k = 0; ; k++) {
        const headerRowIdx = (headerRow - 1) + k * blockHeight;
        if (headerRowIdx >= rows.length) break;

        const headerData = rows[headerRowIdx] ?? [];

        const hasAnyTeam = Array.from({length: TEAMS_PER_ROW}, (_, s) =>
            headerData[s * blockStride + 2]?.trim()
        ).some(Boolean);
        if (!hasAnyTeam) break;

        for (let slot = 0; slot < TEAMS_PER_ROW; slot++) {
            const col = slot * blockStride;
            const teamName = headerData[col + 2]?.trim();
            if (!teamName) continue;

            const teamNumberRaw = parseInt(headerData[col + 1]?.trim() ?? '', 10);
            const teamNumber = isNaN(teamNumberRaw)
                ? k * TEAMS_PER_ROW + slot + 1
                : teamNumberRaw;

            const teamColor = bgColors?.[headerRowIdx]?.[col + 2] ?? null;

            const brickRaw = parseInt(headerData[col + 3]?.trim() ?? '', 10);
            const brickNumber = isNaN(brickRaw) ? null : brickRaw;

            const players: ParsedRosterEntry[] = [];
            for (let pr = 1; pr <= PLAYER_ROWS; pr++) {
                const playerRowIdx = headerRowIdx + pr;
                if (playerRowIdx >= rows.length) break;

                const playerRow = rows[playerRowIdx] ?? [];
                const username = playerRow[col + 2]?.trim();
                if (!username) continue;

                const roleRaw = playerRow[col + 1]?.trim() ?? '';
                players.push({
                    role: ROLE_MAP[roleRaw] ?? 'player',
                    username,
                    rowNumber: playerRowIdx + 1,
                });
            }

            results.push({teamNumber, teamName, teamColor, brickNumber, players, headerCol: col});
        }
    }

    return results;
}
