import {getMatches} from "@/lib/service/matchService";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import { connection } from "next/server";

export default async function MatchList(){
    await connection();
    const result = await getMatches();

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