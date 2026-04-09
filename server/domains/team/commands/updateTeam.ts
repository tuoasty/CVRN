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
        const {data: existing, error: fetchError} = await findTeamById(supabase, p.teamId);

        if (fetchError || !existing || existing.deleted_at) {
            return Err({name: "NotFoundError", message: "Team not found"});
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
                return Err({name: "UploadError", message: "Failed to upload team logo"});
            }

            logoUrl = uploadRes.value.url;
        }

        const {data, error} = await updateTeamById(supabase, p.teamId, {
            name: p.name,
            slug,
            ...(logoUrl !== undefined && {logoUrl}),
            brickNumber: p.brickNumber,
            brickColor: p.brickColor,
            startingLvr: p.startingLvr,
        });

        if (error || !data) {
            logger.error({teamId: p.teamId, error}, "Failed to update team");
            return Err(serializeError(error));
        }

        const {data: teamWithRegion, error: regionFetchError} = await findTeamByIdWithRegion(supabase, p.teamId);

        if (regionFetchError || !teamWithRegion) {
            return Err({name: "FetchError", message: "Failed to fetch updated team"});
        }

        return Ok(teamWithRegion as TeamWithRegion);
    } catch (error) {
        logger.error({error}, "Unexpected error updating team");
        return Err(serializeError(error));
    }
}
