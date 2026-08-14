import {ParsedRosterEntry, ParsedTeamResult, PlayerRole} from "@/server/domains/sheets/types";
import {normalizeTeamName} from "@/server/domains/team/helpers/normalizeTeamName";
import {normalizePositionInput, PositionCode} from "@/shared/volleyball/positions";
import { logger } from "@/server/utils/logger";

const TEAMS_PER_ROW = 5;

const ROLE_MAP: Record<string, PlayerRole> = {
    C: 'captain',
    VC: 'vice_captain',
    CC: 'court_captain',
};

function parsePosition(cell: string | undefined): {position: PositionCode | null; positionInvalid: boolean} {
    const raw = cell?.trim() ?? '';
    if (!raw) return {position: null, positionInvalid: false};
    const normalized = normalizePositionInput(raw);
    if (normalized) return {position: normalized, positionInvalid: false};
    return {position: null, positionInvalid: true};
}

export function parseTeamsSheet(
    rows: string[][],
    headerRow: number,
    blockHeight: number,
    blockStride: number = 4,
    bgColors?: (string | null)[][],
    maxPlayers?: number
): ParsedTeamResult[] {
    const results: ParsedTeamResult[] = [];

    const player_rows = Math.min(maxPlayers ?? Infinity, blockHeight - 2)

    for (let k = 0; ; k++) {
        const headerRowIdx = (headerRow - 1) + k * blockHeight;
        if (headerRowIdx >= rows.length) break;

        const headerData = rows[headerRowIdx] ?? [];

        const hasAnyTeam = Array.from({length: TEAMS_PER_ROW}, (_, s) =>
            headerData[s * blockStride + 3]?.trim()
        ).some(Boolean);
        if (!hasAnyTeam) break;

        for (let slot = 0; slot < TEAMS_PER_ROW; slot++) {
            const col = slot * blockStride + 1;

            const teamName = normalizeTeamName(headerData[col + 2] ?? '');
            const teamNumberRaw = parseInt(headerData[col + 1]?.trim() ?? '', 10);
            const teamNumber = isNaN(teamNumberRaw)
                ? k * TEAMS_PER_ROW + slot + 1
                : teamNumberRaw;

            if (!teamName) {
                const emptyPlayers: ParsedRosterEntry[] = [];
                for (let pr = 1; pr <= player_rows; pr++) {
                    const playerRowIdx = headerRowIdx + pr;
                    if (playerRowIdx >= rows.length) break;
                    const playerRow = rows[playerRowIdx] ?? [];
                    const username = playerRow[col + 2]?.trim();
                    if (!username) continue;
                    const roleRaw = playerRow[col + 1]?.trim() ?? '';
                    const {position, positionInvalid} = parsePosition(playerRow[col + 3]);
                    emptyPlayers.push({
                        role: ROLE_MAP[roleRaw] ?? 'player',
                        username,
                        rowNumber: playerRowIdx + 1,
                        position,
                        positionInvalid,
                    });
                }
                if (emptyPlayers.length > 0) {
                    results.push({teamNumber, teamName: '', teamColor: null, brickNumber: null, players: emptyPlayers, headerCol: col, disbanded: false, nameCleared: true});
                }
                continue;
            }

            if (teamName.toUpperCase() === 'DISBANDED') {
                results.push({teamNumber, teamName: '', teamColor: null, brickNumber: null, players: [], headerCol: col, disbanded: true, nameCleared: false});
                continue;
            }

            logger.debug({teamName:teamName, bgColor:bgColors?.[headerRowIdx]?.[col + 2]})

            const teamColor = bgColors?.[headerRowIdx]?.[col + 2] ?? null;

            const brickRaw = parseInt(headerData[col + 3]?.trim() ?? '', 10);
            const brickNumber = isNaN(brickRaw) ? null : brickRaw;

            const players: ParsedRosterEntry[] = [];
            for (let pr = 1; pr <= player_rows; pr++) {
                const playerRowIdx = headerRowIdx + pr;
                if (playerRowIdx >= rows.length) break;

                const playerRow = rows[playerRowIdx] ?? [];
                const username = playerRow[col + 2]?.trim();
                if (!username) continue;

                const roleRaw = playerRow[col + 1]?.trim() ?? '';
                const {position, positionInvalid} = parsePosition(playerRow[col + 3]);
                players.push({
                    role: ROLE_MAP[roleRaw] ?? 'player',
                    username,
                    rowNumber: playerRowIdx + 1,
                    position,
                    positionInvalid,
                });
            }

            results.push({teamNumber, teamName, teamColor, brickNumber, players, headerCol: col, disbanded: false, nameCleared: false});
        }
    }

    return results;
}
