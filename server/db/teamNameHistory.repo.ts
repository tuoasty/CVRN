import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

export interface TeamNameHistoryEntry {
    id: string;
    teamId: string;
    oldName: string;
    newName: string;
    changedAt: string;
}

type TeamNameHistoryRow = {
    id: string;
    team_id: string;
    old_name: string;
    new_name: string;
    changed_at: string;
};

function toEntry(row: TeamNameHistoryRow): TeamNameHistoryEntry {
    return {
        id: row.id,
        teamId: row.team_id,
        oldName: row.old_name,
        newName: row.new_name,
        changedAt: row.changed_at,
    };
}

export async function insertTeamNameHistory(
    supabase: DBClient,
    dto: {teamId: string; oldName: string; newName: string}
): Promise<Result<TeamNameHistoryEntry>> {
    const {data, error} = await supabase
        .from("team_name_history")
        .insert({team_id: dto.teamId, old_name: dto.oldName, new_name: dto.newName})
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(toEntry(data as unknown as TeamNameHistoryRow));
}

export async function findTeamNameHistoryByTeamId(
    supabase: DBClient,
    teamId: string
): Promise<Result<TeamNameHistoryEntry[]>> {
    const {data, error} = await supabase
        .from("team_name_history")
        .select("*")
        .eq("team_id", teamId)
        .order("changed_at", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(row => toEntry(row as unknown as TeamNameHistoryRow)));
}

export async function deleteTeamNameHistoryById(
    supabase: DBClient,
    id: string
): Promise<Result<true>> {
    const {error} = await supabase
        .from("team_name_history")
        .delete()
        .eq("id", id);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findTeamNameHistoryByTeamIds(
    supabase: DBClient,
    teamIds: string[]
): Promise<Result<TeamNameHistoryEntry[]>> {
    if (teamIds.length === 0) return Ok([]);
    const {data, error} = await supabase
        .from("team_name_history")
        .select("*")
        .in("team_id", teamIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(row => toEntry(row as unknown as TeamNameHistoryRow)));
}
