import ErrorDisplay from "@/app/components/ui/ErrorDisplay";
import {withConnection} from "@/app/components/withConnection";
import {getMatches} from "@/server/services/match.service";

async function MatchList(){
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

export default withConnection(MatchList);