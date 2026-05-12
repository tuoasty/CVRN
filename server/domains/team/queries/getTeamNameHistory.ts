import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {TeamNameHistoryEntry} from "@/server/db/teamNameHistory.repo";
import {findTeamNameHistoryByTeamId} from "@/server/db/teamNameHistory.repo";

export async function getTeamNameHistory(
    supabase: DBClient,
    teamId: string
): Promise<Result<TeamNameHistoryEntry[]>> {
    return findTeamNameHistoryByTeamId(supabase, teamId);
}
