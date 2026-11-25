import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {findPickemMarketRowsByIds, findPickemMatchesByIds, rpcPickemActivity} from "@/server/db/pickems.repo";
import {activityMarketIds, activityMatchIds, buildActivityEntries} from "../helpers/buildActivityEntries";
import {PICKEM_ACTIVITY_PAGE_SIZE, type PickemActivityInput} from "../types/schemas";
import type {PickemActivityPage, PickemMatchSource} from "../types";
import {resolveRobloxNames} from "./resolveRobloxNames";

export async function getPickemActivity(supabase: DBClient, input: PickemActivityInput): Promise<Result<PickemActivityPage>> {
    try {
        const rows = await rpcPickemActivity(supabase, {
            seasonId: input.seasonId,
            source: input.source,
            before: input.before,
            limit: PICKEM_ACTIVITY_PAGE_SIZE + 1,
        });
        if (!rows.ok) return rows;

        const page = rows.value.slice(0, PICKEM_ACTIVITY_PAGE_SIZE);
        const last = page[page.length - 1];
        const nextCursor = rows.value.length > PICKEM_ACTIVITY_PAGE_SIZE && last
            ? {at: last.createdAt, source: last.source, id: last.id}
            : null;

        const markets = await findPickemMarketRowsByIds(supabase, [...new Set(page.flatMap(activityMarketIds))]);
        if (!markets.ok) return markets;
        const marketMatch = new Map(markets.value.map(m => [m.id, m.match_id]));

        const matchIds = [...new Set([...page.flatMap(activityMatchIds), ...marketMatch.values()])];
        const [matches, names] = await Promise.all([
            findPickemMatchesByIds(supabase, matchIds),
            resolveRobloxNames(supabase, page.flatMap(r => r.robloxUserId ? [r.robloxUserId] : [])),
        ]);
        if (!matches.ok) return matches;

        return Ok({
            entries: buildActivityEntries({
                rows: page,
                matches: new Map<string, PickemMatchSource>(matches.value.map(m => [m.id, m])),
                marketMatch,
                names,
            }),
            nextCursor,
        });
    } catch (error) {
        return Err(serializeError(error));
    }
}
