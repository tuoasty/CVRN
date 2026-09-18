import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonsBySeasonNumber} from "@/server/db/seasons.repo";
import {findSeasonPodium} from "@/server/db/seasonHistory.repo";
import {findAllTeamPlayers} from "@/server/db/players.repo";
import {ChampionArchiveEntry, ChampionArchiveResponse} from "../types";

export async function getChampionArchivesBySeasonNumber(
    supabase: DBClient,
    seasonNumber: number
): Promise<Result<ChampionArchiveResponse>> {
    try {
        const seasonsResult = await findSeasonsBySeasonNumber(supabase, seasonNumber);
        if (!seasonsResult.ok) {
            logger.error({seasonNumber, error: seasonsResult.error}, "Failed to fetch seasons by season number");
            return seasonsResult;
        }

        const archive: ChampionArchiveResponse = {};

        for (const season of seasonsResult.value) {
            const podiumResult = await findSeasonPodium(supabase, season.id);
            if (!podiumResult.ok) {
                logger.error({seasonId: season.id, error: podiumResult.error}, "Failed to fetch season podium");
                continue;
            }

            const champion = podiumResult.value.find(p => p.place === 1);
            if (!champion) continue;

            const rosterResult = await findAllTeamPlayers(supabase, champion.team_id, season.id);
            if (!rosterResult.ok) {
                logger.error({seasonId: season.id, teamId: champion.team_id, error: rosterResult.error}, "Failed to fetch champion roster");
                continue;
            }

            const entry: ChampionArchiveEntry = {
                captain: null,
                vice_capt: null,
                court_cap: null,
                members: [],
            };

            const seen = new Set<string>();
            for (const record of rosterResult.value) {
                if (!record.player) continue;
                if (seen.has(record.player.id)) continue;
                seen.add(record.player.id);

                const robloxId = String(record.player.roblox_user_id);
                switch (record.role) {
                    case "captain":
                        entry.captain = robloxId;
                        break;
                    case "vice_captain":
                        entry.vice_capt = robloxId;
                        break;
                    case "court_captain":
                        entry.court_cap = robloxId;
                        break;
                    default:
                        entry.members.push(robloxId);
                }
            }

            archive[season.region_code] = entry;
        }

        return Ok(archive);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching champion archives");
        return Err(serializeError(error));
    }
}
