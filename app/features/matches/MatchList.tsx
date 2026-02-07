"use client"

import ErrorDisplay from "@/app/components/ui/ErrorDisplay";
import {getMatchesAction} from "@/app/actions/match.actions";

async function MatchList(){
    const result = await getMatchesAction();

    if(!result.ok){
        return <ErrorDisplay message="Failed to load matches. Please try again later." />;
    }

    return (
        <ul>
            {result.value.map((match) => (
                <li key={match.id}>{match.name}</li>
            ))}
        </ul>
    )
}

export default MatchList;