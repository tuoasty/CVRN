"use server"

import {createTeam, getAllTeams} from "@/server/services/team.service";

export async function createTeamAction(name:string, file:File){
    return createTeam({
        name,
        logoFile:file
    })
}

export async function getAllTeamsAction(){
    return getAllTeams()
}