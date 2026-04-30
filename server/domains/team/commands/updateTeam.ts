import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {BUCKETS, extractStoragePath, STORAGE_PATHS} from "@/server/storage/storage.paths";
import {getFileExtension} from "@/server/utils/fileExtension";
import {deleteFile, uploadFile} from "@/server/storage/storage.service";
import {findTeamById, findTeamByIdWithRegion, updateTeamById} from "@/server/db/teams.repo";
import {generateSlug} from "../helpers/generateSlug";
import {TeamWithRegion, UpdateTeamInput} from "../types";

export async function updateTeam(supabase: DBClient, p: UpdateTeamInput): Promise<Result<TeamWithRegion>> {
    try {
        const lookup = await findTeamById(supabase, p.teamId);
        if (!lookup.ok) {
            logger.error({teamId: p.teamId, error: lookup.error}, "Failed to look up team");
            return lookup;
        }
        const existing = lookup.value;
        if (!existing || existing.deleted_at) {
            return Err({message: "Team not found", code: "NOT_FOUND"});
        }

        const slug = generateSlug(p.name);
        let logoUrl: string | undefined = undefined;

        if (p.logoFile) {
            if (existing.logo_url) {
                const oldPath = extractStoragePath(existing.logo_url, BUCKETS.PUBLIC);
                await deleteFile(supabase, {bucket: BUCKETS.PUBLIC, path: oldPath});
            }

            const ext = getFileExtension(p.logoFile);
            const path = STORAGE_PATHS.teamLogoVersioned(p.teamId, ext);

            const uploadRes = await uploadFile(supabase, {
                bucket: BUCKETS.PUBLIC,
                path,
                file: p.logoFile,
                contentType: p.logoFile.type,
                compress: true,
                userId: p.userId,
            });

            if (!uploadRes.ok) {
                logger.error({teamId: p.teamId, error: uploadRes.error}, "Failed to upload new team logo");
                return Err({message: "Failed to upload team logo", code: "INTEGRATION_ERROR"});
            }

            logoUrl = uploadRes.value.url;
        }

        const updateResult = await updateTeamById(supabase, p.teamId, {
            name: p.name,
            slug,
            ...(logoUrl !== undefined && {logoUrl}),
            brickNumber: p.brickNumber,
            brickColor: p.brickColor,
            startingLvr: p.startingLvr,
        });
        if (!updateResult.ok) {
            logger.error({teamId: p.teamId, error: updateResult.error}, "Failed to update team");
            return updateResult;
        }

        const regionLookup = await findTeamByIdWithRegion(supabase, p.teamId);
        if (!regionLookup.ok || !regionLookup.value) {
            return Err({message: "Failed to fetch updated team", code: "DB_ERROR"});
        }

        return Ok(regionLookup.value as TeamWithRegion);
    } catch (error) {
        logger.error({error}, "Unexpected error updating team");
        return Err(serializeError(error));
    }
}
