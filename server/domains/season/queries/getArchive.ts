import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findArchiveSeasons} from "@/server/db/seasonHistory.repo";
import {findChampionGfxBySeasonIds} from "@/server/db/mediaPost.repo";
import {ArchiveSeason} from "../types";

export async function getArchive(
    supabase: DBClient
): Promise<Result<ArchiveSeason[]>> {
    try {
        const result = await findArchiveSeasons(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to fetch archive");
            return result;
        }

        const seasons = result.value as Array<ArchiveSeason & {id: string}>;
        const ids = seasons.map(s => s.id);

        const gfxResult = await findChampionGfxBySeasonIds(supabase, ids);
        if (!gfxResult.ok) {
            logger.error({error: gfxResult.error}, "Failed to fetch champion GFX for archive");
            return gfxResult;
        }

        const bySeason = new Map<string, {id: string; image_url: string | null; title: string}>();
        for (const p of gfxResult.value) {
            if (p.season_id) bySeason.set(p.season_id, {id: p.id, image_url: p.image_url, title: p.title});
        }

        const merged = seasons.map(s => ({
            ...s,
            champion_gfx: bySeason.has(s.id) ? [bySeason.get(s.id)!] : [],
        }));

        return Ok(merged as ArchiveSeason[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching archive");
        return Err(serializeError(error));
    }
}
