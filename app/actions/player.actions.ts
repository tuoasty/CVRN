"use server"

import {z} from "zod"
import {
    savePlayerToTeam,
    getUsersByName,
    getTeamPlayers,
    removePlayerFromTeamService,
    getPlayersByIds,
    searchPlayersInDatabase,
    searchPlayersForPublic,
    getRecentPlayersForPublic,
    addExistingPlayerToTeam,
    getPlayerByExactUsername,
    setPlayerRoleService,
    transferCaptainService,
    getPlayerByUsername,
    getPlayerSeasonStats,
    getPlayerAwards,
    getPlayerTeamHistory,
} from "@/server/domains/player";
import type {PlayerDetail} from "@/server/domains/player";
import {createServerSupabase} from "@/server/supabase/server";
import {Err, Ok, Result} from "@/shared/types/result";
import {
    SavePlayerToTeamSchema,
    RemovePlayerFromTeamSchema,
    TeamPlayersSchema,
    PlayersByIdsSchema,
    SearchPlayersSchema,
    AddExistingPlayerToTeamSchema,
    SetPlayerRoleSchema,
    TransferCaptainSchema,
} from "@/server/domains/player";

export async function searchPlayersAction(username: string) {
    const parsed = z.string().min(1).safeParse(username);
    if (!parsed.success) return Err({message: "Search query must not be empty", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getUsersByName(supabase, parsed.data);
}

export async function savePlayerToTeamAction(input: unknown) {
    const parsed = SavePlayerToTeamSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return savePlayerToTeam(supabase, parsed.data);
}

export async function removePlayerFromTeamAction(input: unknown) {
    const parsed = RemovePlayerFromTeamSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return removePlayerFromTeamService(supabase, parsed.data);
}

export async function getTeamPlayersAction(input: unknown) {
    const parsed = TeamPlayersSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getTeamPlayers(supabase, parsed.data);
}

export async function getPlayersByIdsAction(input: unknown) {
    const parsed = PlayersByIdsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getPlayersByIds(supabase, parsed.data);
}

export async function searchPlayersInDatabaseAction(input: unknown) {
    const parsed = SearchPlayersSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return searchPlayersInDatabase(supabase, parsed.data);
}

export async function searchPlayersForPublicAction(input: unknown) {
    const parsed = z.object({query: z.string().min(1)}).safeParse(input);
    if (!parsed.success) return Err({message: "Search query must not be empty", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return searchPlayersForPublic(supabase, parsed.data);
}

export async function getRecentPlayersForPublicAction() {
    const supabase = await createServerSupabase();
    return getRecentPlayersForPublic(supabase);
}

export async function addExistingPlayerToTeamAction(input: unknown) {
    const parsed = AddExistingPlayerToTeamSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return addExistingPlayerToTeam(supabase, parsed.data);
}

export async function getPlayerByExactUsernameAction(input: unknown) {
    const parsed = SearchPlayersSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getPlayerByExactUsername(supabase, parsed.data);
}

export async function setPlayerRoleAction(input: unknown) {
    const parsed = SetPlayerRoleSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return setPlayerRoleService(supabase, parsed.data);
}

export async function transferCaptainAction(input: unknown) {
    const parsed = TransferCaptainSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return transferCaptainService(supabase, parsed.data);
}

export async function getPlayerDetailAction(username: string): Promise<Result<PlayerDetail>> {
    const supabase = await createServerSupabase();

    const playerResult = await getPlayerByUsername(supabase, {username});
    if (!playerResult.ok) return playerResult;
    if (!playerResult.value) return Err({message: "Player not found", code: "NOT_FOUND"});

    const player = playerResult.value;

    const [statsResult, awardsResult, historyResult] = await Promise.all([
        getPlayerSeasonStats(supabase, {playerId: player.id}),
        getPlayerAwards(supabase, {playerId: player.id}),
        getPlayerTeamHistory(supabase, {playerId: player.id}),
    ]);

    if (!statsResult.ok) return statsResult;
    if (!awardsResult.ok) return awardsResult;
    if (!historyResult.ok) return historyResult;

    return Ok({
        player,
        seasonStats: statsResult.value,
        awards: awardsResult.value,
        teamHistory: historyResult.value,
    });
}

