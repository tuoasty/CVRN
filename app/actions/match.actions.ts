"use server"

import {getMatches} from "@/server/services/match.service";

export async function getMatchesAction(){
    return getMatches();
}