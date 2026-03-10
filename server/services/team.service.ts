import {randomUUID} from "node:crypto";
import {BUCKETS, extractStoragePath, STORAGE_PATHS} from "@/server/storage/storage.paths";
import {getFileExtension} from "@/server/utils/fileExtension";
import {deleteFile, uploadFile} from "@/server/storage/storage.service";
import {Err, Ok, Result} from "@/shared/types/result";
import { logger } from "@/server/utils/logger";

import {
    findAllTeams, findAllTeamsWithRegions,
    findTeamById, findTeamByIdWithRegion, findTeamByNameAndSeason, findTeamBySlugAndSeasonWithRegion, findTeamsByIds,
    insertTeam, softDeleteTeamById, updateTeamById
} from "@/server/db/teams.repo";
import {serializeError} from "@/server/utils/serializeableError";
import {DBClient, Team} from "@/shared/types/db";
import {
    CreateTeamInput, GetTeamByNameSeason,
    TeamIdInput,
    TeamWithRegion,
    TeamWithRegionAndPlayers, UpdateTeamInput
} from "@/server/dto/team.dto";
import {findAllTeamPlayers, removePlayerFromTeam} from "@/server/db/players.repo";
import {PlayerRole} from "@/server/dto/player.dto";

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

export async function createTeam(supabase:DBClient, p:CreateTeamInput):Promise<Result<TeamWithRegion>>{
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
            contentType:p.logoFile.type,
            compress: true,
            userId: p.userId
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
            seasonId: p.seasonId,
            brickNumber: p.brickNumber,
            brickColor: p.brickColor,
            startingLvr: p.startingLvr,
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

export async function getTeamByNameAndSeason(supabase: DBClient, p: GetTeamByNameSeason) {
    try {
        const { data, error } = await findTeamByNameAndSeason(supabase, p)
        if(error){
            logger.error({ name: p.name, seasonId: p.seasonId, error }, "Failed to fetch team by name and season");
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

export async function deleteTeam(supabase: DBClient, p: TeamIdInput): Promise<Result<void>> {
    try {
        const { data: team } = await findTeamById(supabase, p.teamId)
        if (!team || team.deleted_at) {
            logger.warn({ teamId: p.teamId }, "Attempted to delete non-existent or already deleted team");
            return Err({
                name: "TeamNotFound",
                message: "Team does not exist"
            })
        }

        const { data: activePlayersResult, error: checkError } = await findAllTeamPlayers(supabase, p.teamId, team.season_id)
        if (checkError) {
            logger.error({ teamId: p.teamId, error: checkError }, "Failed to check team players during deletion");
            return Err(serializeError(checkError))
        }

        if (activePlayersResult && activePlayersResult.length > 0) {
            for (const record of activePlayersResult) {
                if (record.player) {
                    const { error: removeError } = await removePlayerFromTeam(supabase, {
                        playerId: record.player.id,
                        seasonId: team.season_id
                    })
                    if (removeError) {
                        logger.error({ teamId: p.teamId, playerId: record.player.id, error: removeError }, "Failed to remove player from team during deletion");
                        return Err(serializeError(removeError))
                    }
                }
            }
        }

        const { error } = await softDeleteTeamById(supabase, p.teamId)
        if (error) {
            logger.error({ teamId: p.teamId, error }, "Failed to soft delete team");
            return Err(serializeError(error))
        }

        return Ok(undefined)
    } catch (error) {
        return Err(serializeError(error))
    }
}


export async function getTeamBySlugAndSeasonWithRegion(supabase: DBClient, p: {
    slug: string;
    seasonId: string;
}) {
    try {
        const { data, error } = await findTeamBySlugAndSeasonWithRegion(supabase, p)
        if(error){
            logger.error({ slug: p.slug, seasonId: p.seasonId, error }, "Failed to fetch team by slug and season");
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
    seasonId: string;
}): Promise<Result<TeamWithRegionAndPlayers>> {
    try {
        const { data: teamData, error: teamError } = await findTeamBySlugAndSeasonWithRegion(supabase, p)

        if (teamError) {
            logger.error({ slug: p.slug, seasonId: p.seasonId, error: teamError }, "Failed to fetch team with region");
            return Err(serializeError(teamError))
        }

        if (!teamData) {
            return Err({
                message: "Team not found",
                name: "NotFoundError"
            })
        }

        const { data: playersData, error: playersError } = await findAllTeamPlayers(supabase, teamData.id, p.seasonId)

        if (playersError) {
            logger.error({ teamId: teamData.id, seasonId: p.seasonId, error: playersError }, "Failed to fetch team players");
            return Err(serializeError(playersError))
        }

        const playersWithRoles = playersData?.map(record => ({
            ...record.player,
            role: (record.role || 'player') as PlayerRole
        })) || []

        return Ok({
            team: teamData as TeamWithRegion,
            players: playersWithRoles
        })
    } catch (error) {
        return Err(serializeError(error))
    }
}

export async function getTeamsByIds(
    supabase: DBClient,
    teamIds: string[]
): Promise<Result<TeamWithRegion[]>> {
    try {
        if (teamIds.length === 0) {
            return Ok([]);
        }

        const { data, error } = await findTeamsByIds(supabase, teamIds);

        if (error) {
            logger.error({ teamIds, error }, "Failed to fetch teams by IDs");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch teams",
                name: "FetchError"
            });
        }

        const teamsWithRegions = data.map(team => ({
            ...team,
            region: team.seasons.regions
        }));

        return Ok(teamsWithRegions as TeamWithRegion[]);
    } catch (error) {
        return Err(serializeError(error));
    }
}

export async function updateTeam(supabase: DBClient, p: UpdateTeamInput): Promise<Result<TeamWithRegion>> {
    try {
        const { data: existing, error: fetchError } = await findTeamById(supabase, p.teamId);

        if (fetchError || !existing || existing.deleted_at) {
            return Err({ name: "NotFoundError", message: "Team not found" });
        }

        const slug = generateSlug(p.name);
        let logoUrl: string | undefined = undefined;

        if (p.logoFile) {
            if (existing.logo_url) {
                const oldPath = extractStoragePath(existing.logo_url, BUCKETS.PUBLIC);
                await deleteFile(supabase, { bucket: BUCKETS.PUBLIC, path: oldPath });
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
                logger.error({ teamId: p.teamId, error: uploadRes.error }, "Failed to upload new team logo");
                return Err({ name: "UploadError", message: "Failed to upload team logo" });
            }

            logoUrl = uploadRes.value.url;
        }

        const { data, error } = await updateTeamById(supabase, p.teamId, {
            name: p.name,
            slug,
            ...(logoUrl !== undefined && { logoUrl }),
            brickNumber: p.brickNumber,
            brickColor: p.brickColor,
            startingLvr: p.startingLvr,
        });

        if (error || !data) {
            logger.error({ teamId: p.teamId, error }, "Failed to update team");
            return Err(serializeError(error));
        }

        const { data: teamWithRegion, error: regionFetchError } = await findTeamByIdWithRegion(supabase, p.teamId);

        if (regionFetchError || !teamWithRegion) {
            return Err({ name: "FetchError", message: "Failed to fetch updated team" });
        }

        return Ok(teamWithRegion as TeamWithRegion);
    } catch (error) {
        logger.error({ error }, "Unexpected error updating team");
        return Err(serializeError(error));
    }
}