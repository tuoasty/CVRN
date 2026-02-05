"use server"

import {getUsersByName} from "@/server/services/player.service";

export async function searchPlayersAction(username:string){
    return getUsersByName(username);
}