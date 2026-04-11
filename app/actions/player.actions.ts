"use server"

import {
    savePlayerToTeam,
    getUsersByName,
    getTeamPlayers,
    removePlayerFromTeamService,
    getPlayersByIds,
    searchPlayersInDatabase,
    addExistingPlayerToTeam,
    getPlayerByExactUsername,
    setPlayerRoleService,
    transferCaptainService
} from "@/server/domains/player";
import {createServerSupabase} from "@/server/supabase/server";
import type {
    SavePlayerToTeamInput,
    RemovePlayerFromTeamInput,
    TeamPlayersInput,
    PlayersByIdsInput,
    SearchPlayersInput,
    AddExistingPlayerToTeamInput,
    SetPlayerRoleInput,
    TransferCaptainInput
} from "@/server/domains/player";

export async function searchPlayersAction(username:string){
    const supabase = await createServerSupabase();
    return getUsersByName(supabase, username);
}

export async function savePlayerToTeamAction(input:SavePlayerToTeamInput){
    const supabase = await createServerSupabase();
    return savePlayerToTeam(supabase, input)
}

export async function removePlayerFromTeamAction(input:RemovePlayerFromTeamInput){
    const supabase = await createServerSupabase();
    return removePlayerFromTeamService(supabase, input)
}

export async function getTeamPlayersAction(input:TeamPlayersInput){
    const supabase = await createServerSupabase();
    return getTeamPlayers(supabase, input)
}

export async function getPlayersByIdsAction(input: PlayersByIdsInput) {
    const supabase = await createServerSupabase();
    return getPlayersByIds(supabase, input);
}

export async function searchPlayersInDatabaseAction(input: SearchPlayersInput) {
    const supabase = await createServerSupabase();
    return searchPlayersInDatabase(supabase, input);
}

export async function addExistingPlayerToTeamAction(input: AddExistingPlayerToTeamInput) {
    const supabase = await createServerSupabase();
    return addExistingPlayerToTeam(supabase, input);
}

export async function getPlayerByExactUsernameAction(input: SearchPlayersInput) {
    const supabase = await createServerSupabase();
    return getPlayerByExactUsername(supabase, input);
}

export async function setPlayerRoleAction(input: SetPlayerRoleInput) {
    const supabase = await createServerSupabase();
    return setPlayerRoleService(supabase, input);
}

export async function transferCaptainAction(input: TransferCaptainInput) {
    const supabase = await createServerSupabase();
    return transferCaptainService(supabase, input);
}