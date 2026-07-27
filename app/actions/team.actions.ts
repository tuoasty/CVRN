"use server"

import {createServerSupabase} from "@/server/supabase/server";
import {getSupabaseAdmin} from "@/server/supabase/admin";
import {z} from "zod"
import {Result, Err, Ok} from "@/shared/types/result";
import {getUserRole} from "@/server/db/roles.repo";
import {revalidatePath} from "next/cache";
import {revalidatePublicData} from "@/server/cache/revalidate";
import {CACHE_TAGS} from "@/server/cache/tags";
import {BUCKETS, STORAGE_PATHS, extractStoragePath} from "@/server/storage/storage.paths";
import {uploadFile, deleteFile} from "@/server/storage/storage.service";
import {findTeamById, updateTeamById, findTeamsBySeasonId} from "@/server/db/teams.repo";
import {logger} from "@/server/utils/logger";
import {
    TeamWithRegion,
    TeamWithRegionAndPlayers,
    TeamNameHistoryEntry,
    GetTeamByNameSeasonSchema,
    TeamIdSchema,
    TeamSlugSeasonSchema,
    CreateTeamFormSchema,
    UpdateTeamFormSchema,
} from "@/server/domains/team";
import {
    createTeam,
    deleteTeam,
    getAllTeams,
    getAllTeamsWithRegions,
    getTeamByNameAndSeason,
    getTeamsByIds,
    getTeamWithRegionAndPlayers,
    getTeamNameHistory,
    updateTeam
} from "@/server/domains/team";
import {Team} from "@/shared/types/db";

async function requireAuth(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
    const {data: {user}} = await supabase.auth.getUser();
    return user;
}

export async function createTeamAction(formData: FormData) {
    const parsed = CreateTeamFormSchema.safeParse({
        name: formData.get('name'),
        seasonId: formData.get('seasonId'),
        brickNumber: formData.get('brickNumber'),
        brickColor: formData.get('brickColor'),
        startingLvr: formData.get('startingLvr'),
        startingPoints: formData.get('startingPoints'),
    });
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});

    const file = formData.get('logo') as File;
    const removeBackground = formData.get('removeBackground') !== 'false';

    const result = await createTeam(supabase, {
        name: parsed.data.name,
        logoFile: file,
        seasonId: parsed.data.seasonId,
        userId: user.id,
        brickNumber: parsed.data.brickNumber,
        brickColor: parsed.data.brickColor,
        startingLvr: parsed.data.startingLvr,
        startingPoints: parsed.data.startingPoints,
        removeBackground,
    });
    if (result.ok) revalidatePublicData([CACHE_TAGS.teams]);
    return result;
}

export async function getAllTeamsAction() {
    const supabase = await createServerSupabase();
    return getAllTeams(supabase);
}

export async function getAllTeamsWithRegionsAction(): Promise<Result<TeamWithRegion[]>> {
    const supabase = await createServerSupabase();
    return getAllTeamsWithRegions(supabase);
}

export async function getTeamByNameAndSeasonAction(input: unknown): Promise<Result<Team>> {
    const parsed = GetTeamByNameSeasonSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getTeamByNameAndSeason(supabase, parsed.data);
}

export async function deleteTeamAction(input: unknown): Promise<Result<void>> {
    const parsed = TeamIdSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const result = await deleteTeam(supabase, parsed.data);
    if (result.ok) revalidatePublicData([CACHE_TAGS.teams, CACHE_TAGS.players]);
    return result;
}

export async function getTeamWithPlayersAction(params: unknown): Promise<Result<TeamWithRegionAndPlayers>> {
    const parsed = TeamSlugSeasonSchema.safeParse(params);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getTeamWithRegionAndPlayers(supabase, parsed.data);
}

export async function getTeamsByIdsAction(teamIds: unknown): Promise<Result<TeamWithRegion[]>> {
    const parsed = z.array(z.uuid()).safeParse(teamIds);
    if (!parsed.success) return Err({message: "Invalid team IDs", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getTeamsByIds(supabase, parsed.data);
}

export async function getTeamNameHistoryAction(teamId: string): Promise<Result<TeamNameHistoryEntry[]>> {
    const parsed = TeamIdSchema.safeParse({teamId});
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getTeamNameHistory(supabase, parsed.data.teamId);
}

export async function getTeamsBySeasonAction(input: unknown): Promise<Result<Team[]>> {
    const parsed = z.object({seasonId: z.string().uuid()}).safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return findTeamsBySeasonId(supabase, parsed.data.seasonId);
}

export async function updateTeamAction(formData: FormData) {
    const parsed = UpdateTeamFormSchema.safeParse({
        teamId: formData.get('teamId'),
        name: formData.get('name'),
        brickNumber: formData.get('brickNumber'),
        brickColor: formData.get('brickColor'),
        startingLvr: formData.get('startingLvr'),
        startingPoints: formData.get('startingPoints'),
    });
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});

    const file = formData.get('logo') as File | null;
    const removeBackground = formData.get('removeBackground') !== 'false';

    const result = await updateTeam(supabase, {
        teamId: parsed.data.teamId,
        name: parsed.data.name,
        logoFile: file && file.size > 0 ? file : null,
        userId: user.id,
        brickNumber: parsed.data.brickNumber,
        brickColor: parsed.data.brickColor,
        startingLvr: parsed.data.startingLvr,
        startingPoints: parsed.data.startingPoints,
        removeBackground,
    });
    // Name, colour and logo all render on public team and standings pages.
    if (result.ok) revalidatePublicData([CACHE_TAGS.teams, CACHE_TAGS.standings]);
    return result;
}

export async function uploadTeamLogoAction(teamId: string, formData: FormData) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Err({ message: "Not authenticated", code: "UNAUTHORIZED" as const });

    const roleResult = await getUserRole(supabase, user.id);
    if (!roleResult.ok) return Err(roleResult.error);
    const role = roleResult.value;
    if (role !== 'staff' && role !== 'admin' && role !== 'super_admin') {
        return Err({ message: "Insufficient permissions", code: "FORBIDDEN" as const });
    }

    const file = formData.get('logo') as File | null;
    if (!file || file.size === 0) return Err({ message: "No file provided", code: "VALIDATION_ERROR" as const });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = getSupabaseAdmin() as any;

    const teamResult = await findTeamById(admin, teamId);
    if (!teamResult.ok) return Err(teamResult.error);
    if (!teamResult.value || teamResult.value.deleted_at) {
        return Err({ message: "Team not found", code: "NOT_FOUND" as const });
    }

    const existing = teamResult.value;
    if (existing.logo_url) {
        const oldPath = extractStoragePath(existing.logo_url, BUCKETS.PUBLIC);
        await deleteFile(admin, { bucket: BUCKETS.PUBLIC, path: oldPath });
    }

    const path = STORAGE_PATHS.teamLogoVersioned(teamId, 'webp');
    const uploadResult = await uploadFile(admin, {
        bucket: BUCKETS.PUBLIC,
        path,
        file,
        contentType: 'image/webp',
        compress: true,
        userId: user.id,
    });
    if (!uploadResult.ok) {
        logger.error({ teamId, error: uploadResult.error }, "Logo upload failed");
        return Err(uploadResult.error);
    }

    const updateResult = await updateTeamById(admin, teamId, {
        logoUrl: uploadResult.value.url,
        logoBgRemoved: uploadResult.value.bgRemoved,
    });
    if (!updateResult.ok) {
        logger.error({ teamId, error: updateResult.error }, "Failed to update team logo_url");
        return Err(updateResult.error);
    }

    revalidatePath('/admin/teams');
    // Logos render on team, standings and match pages — this is the manual edit path
    // that most often needs to show up on the public site immediately.
    revalidatePublicData([CACHE_TAGS.teams, CACHE_TAGS.standings, CACHE_TAGS.matches]);
    return Ok({ logoUrl: uploadResult.value.url });
}
