import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {findSpecWinnersBySeasons} from "@/server/db/specWinners.repo";
import {getAllSeasons} from "@/server/domains/season";
import {latestEndedSeasons} from "../helpers/recentSpecWinners";
import type {RecentSpecWinners} from "../types/recentWinners";

export async function getRecentSpecWinners(supabase: DBClient): Promise<Result<RecentSpecWinners>> {
    const seasons = await getAllSeasons(supabase);
    if (!seasons.ok) return seasons;

    const picked = latestEndedSeasons(seasons.value, new Date());
    const seasonsByRegion = Object.fromEntries(picked);
    const winners = await findSpecWinnersBySeasons(supabase, [...picked.values()].flat().map(s => s.id));
    if (!winners.ok) return winners;

    return Ok({seasonsByRegion, winners: winners.value});
}
