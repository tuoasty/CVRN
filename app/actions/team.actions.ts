"use server"

import {createTeam} from "@/server/services/team.service";

export async function createTeamAction(name:string, file:File){
    return createTeam({
        name,
        logoFile:file
    })
}