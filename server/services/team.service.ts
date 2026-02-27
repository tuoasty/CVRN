import {randomUUID} from "node:crypto";
import {BUCKETS, extractStoragePath, STORAGE_PATHS} from "@/server/storage/storage.paths";
import {getFileExtension} from "@/server/utils/fileExtension";
import {deleteFile, uploadFile} from "@/server/storage/storage.service";
import {Err, Ok, Result} from "@/shared/types/result";
import { logger } from "@/server/utils/logger";

import {
    deleteTeamById,
    findAllTeams, findAllTeamsWithRegions,
    findTeamById, findTeamByIdWithRegion,
    findTeamByNameAndRegion,
    findTeamBySlugAndRegion, findTeamBySlugAndRegionWithRegion,
    insertTeam
} from "@/server/db/teams.repo";
import {serializeError} from "@/server/utils/serializeableError";
import {DBClient, Team} from "@/shared/types/db";
import {GetTeamByNameRegion, TeamIdInput, TeamWithRegion, TeamWithRegionAndPlayers} from "@/server/dto/team.dto";
import {findAllTeamPlayers, removeAllPlayersFromTeam} from "@/server/db/players.repo";

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function createTeam(supabase:DBClient, p:{
    name:string;
    logoFile:File;
    regionId:string;
}):Promise<Result<TeamWithRegion>>{
    let uploadedPath: string | null = null
    let success = false;

    try {
        const teamId = randomUUID()
        const slug = generateSlug(p.name);
        const ext = getFileExtension(p.logoFile)
        const path = STORAGE_PATHS.teamLogo(teamId, ext);

        const uploadRes = await uploadFile(supabase, {
            bucket: BUCKETS.PUBLIC,
            path,
            file:p.logoFile,
            contentType:p.logoFile.type
        });

        if(!uploadRes.ok){
            logger.error({ teamId, error: uploadRes.error }, "Failed to upload team logo");
            return Err({
                message:"Failed to upload team logo",
                name:"UploadError"
            });
        }

        uploadedPath = path
        const {data, error} = await insertTeam(supabase, {
            id: teamId,
            name: p.name,
            slug,
            logoUrl: uploadRes.value.url,
            regionId: p.regionId
        })
        if(error || !data){
            logger.error({ teamId, error }, "Failed to insert team, cleaning up uploaded file");
            await deleteFile(supabase, {
                bucket:BUCKETS.PUBLIC,
                path,
            })
        }
        if(error){
            return Err(serializeError(error))
        }
        if(!data) {
            return Err({
                message:"Failed to insert new team",
                name:"InsertError"
            })
        }

        const { data: teamWithRegion, error: fetchError } = await findTeamByIdWithRegion(supabase, teamId)

        if (fetchError || !teamWithRegion) {
            logger.error({ teamId, error: fetchError }, "Failed to fetch created team with region");
            return Err({
                message: "Failed to fetch created team with region",
                name: "FetchError"
            })
        }

        success = true
        return Ok(teamWithRegion as TeamWithRegion)
    } catch(error){
        return Err(serializeError(error))
    } finally {
        if(!success && uploadedPath){
            await deleteFile(supabase, {
                bucket: BUCKETS.PUBLIC,
                path: uploadedPath
            })
        }
    }
}

export async function getAllTeams(supabase: DBClient):Promise<Result<Team[]>> {
    try {
        const { data, error } = await findAllTeams(supabase)
        if(error){
            logger.error({ error }, "Failed to fetch all teams");
            return Err(serializeError(error))
        }

        if(!data){
            return Err({
                message:"Failed to fetch teams",
                name:"FetchError"
            })
        }

        return Ok(data)
    } catch (error){
        return Err(serializeError(error))
    }
}

export async function getAllTeamsWithRegions(supabase: DBClient): Promise<Result<TeamWithRegion[]>> {
    try {
        const { data, error } = await findAllTeamsWithRegions(supabase)
        if (error) {
            logger.error({ error }, "Failed to fetch teams with regions");
            return Err(serializeError(error))
        }

        if (!data) {
            return Err({
                message: "Failed to fetch teams with regions",
                name: "FetchError"
            })
        }

        return Ok(data as TeamWithRegion[])
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function getTeamByNameAndRegion(supabase: DBClient, p:GetTeamByNameRegion) {
    try {
        const { data, error } = await findTeamByNameAndRegion(supabase, p)
        if(error){
            logger.error({ name: p.name, regionId: p.regionId, error }, "Failed to fetch team by name and region");
            return Err(serializeError(error))
        }

        if(!data){
            return Err({
                message:"Failed to fetch team",
                name:"FetchError"
            })
        }

        return Ok(data)
    } catch (error){
        return Err(serializeError(error))
    }
}

export async function deleteTeam(supabase: DBClient, p:TeamIdInput): Promise<Result<void>> {
    try {
        const { data: team } = await findTeamById(supabase, p.teamId)
        if (!team) {
            logger.warn({ teamId: p.teamId }, "Attempted to delete non-existent team");
            return Err({
                name: "TeamNotFound",
                message: "Team does not exist"
            })
        }

        const { error: playersError } = await removeAllPlayersFromTeam(supabase, p.teamId)
        if (playersError) {
            logger.error({ teamId: p.teamId, error: playersError }, "Failed to remove players from team during deletion");
            return Err(serializeError(playersError))
        }

        const { error } = await deleteTeamById(supabase, p.teamId)
        if (error) {
            logger.error({ teamId: p.teamId, error }, "Failed to delete team");
            return Err(serializeError(error))
        }

        if (team.logo_url) {
            await deleteFile(supabase, {
                bucket: BUCKETS.PUBLIC,
                path: extractStoragePath(team.logo_url, BUCKETS.PUBLIC)
            })
        }

        return Ok(undefined)
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function getTeamBySlugAndRegionWithRegion(supabase: DBClient, p: {
    slug: string;
    regionId: string;
}) {
    try {
        const { data, error } = await findTeamBySlugAndRegionWithRegion(supabase, p)
        if(error){
            logger.error({ slug: p.slug, regionId: p.regionId, error }, "Failed to fetch team by slug and region");
            return Err(serializeError(error))
        }
        if(!data){
            return Err({
                message:"Failed to fetch team",
                name:"FetchError"
            })
        }

        return Ok(data)
    } catch (error){
        return Err(serializeError(error))
    }
}

export async function getTeamWithRegionAndPlayers(supabase: DBClient, p: {
    slug: string;
    regionId: string;
}): Promise<Result<TeamWithRegionAndPlayers>> {
    try {
        const { data: teamData, error: teamError } = await findTeamBySlugAndRegionWithRegion(supabase, p)

        if (teamError) {
            logger.error({ slug: p.slug, regionId: p.regionId, error: teamError }, "Failed to fetch team with region");
            return Err(serializeError(teamError))
        }

        if (!teamData) {
            return Err({
                message: "Team not found",
                name: "NotFoundError"
            })
        }

        const { data: playersData, error: playersError } = await findAllTeamPlayers(supabase, teamData.id)

        if (playersError) {
            logger.error({ teamId: teamData.id, error: playersError }, "Failed to fetch team players");
            return Err(serializeError(playersError))
        }

        return Ok({
            team: teamData as TeamWithRegion,
            players: playersData || []
        })
    } catch (error) {
        return Err(serializeError(error))
    }
}