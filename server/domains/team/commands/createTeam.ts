import {randomUUID} from "node:crypto";
import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {BUCKETS, STORAGE_PATHS} from "@/server/storage/storage.paths";
import {getFileExtension} from "@/server/utils/fileExtension";
import {deleteFile, uploadFile} from "@/server/storage/storage.service";
import {findTeamByIdWithRegion, insertTeam} from "@/server/db/teams.repo";
import {generateSlug} from "../helpers/generateSlug";
import {CreateTeamInput, TeamWithRegion} from "../types";

export async function createTeam(supabase: DBClient, p: CreateTeamInput): Promise<Result<TeamWithRegion>> {
    let uploadedPath: string | null = null;
    let success = false;

    try {
        const teamId = randomUUID();
        const slug = generateSlug(p.name);
        const ext = getFileExtension(p.logoFile);
        const path = STORAGE_PATHS.teamLogo(teamId, ext);

        const uploadRes = await uploadFile(supabase, {
            bucket: BUCKETS.PUBLIC,
            path,
            file: p.logoFile,
            contentType: p.logoFile.type,
            compress: true,
            userId: p.userId
        });

        if (!uploadRes.ok) {
            logger.error({teamId, error: uploadRes.error}, "Failed to upload team logo");
            return Err({
                message: "Failed to upload team logo",
                code: "INTEGRATION_ERROR"
            });
        }

        uploadedPath = path;
        const {data, error} = await insertTeam(supabase, {
            id: teamId,
            name: p.name,
            slug,
            logoUrl: uploadRes.value.url,
            seasonId: p.seasonId,
            brickNumber: p.brickNumber,
            brickColor: p.brickColor,
            startingLvr: p.startingLvr,
        });
        if (error || !data) {
            logger.error({teamId, error}, "Failed to insert team, cleaning up uploaded file");
            await deleteFile(supabase, {
                bucket: BUCKETS.PUBLIC,
                path,
            });
        }
        if (error) {
            return Err(serializeError(error, "DB_ERROR"));
        }
        if (!data) {
            return Err({
                message: "Failed to insert new team",
                code: "DB_ERROR"
            });
        }

        const {data: teamWithRegion, error: fetchError} = await findTeamByIdWithRegion(supabase, teamId);

        if (fetchError || !teamWithRegion) {
            logger.error({teamId, error: fetchError}, "Failed to fetch created team with region");
            return Err({
                message: "Failed to fetch created team with region",
                code: "DB_ERROR"
            });
        }

        success = true;
        return Ok(teamWithRegion as TeamWithRegion);
    } catch (error) {
        return Err(serializeError(error));
    } finally {
        if (!success && uploadedPath) {
            await deleteFile(supabase, {
                bucket: BUCKETS.PUBLIC,
                path: uploadedPath
            });
        }
    }
}
