import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {deleteSpecWinnerById} from "@/server/db/specWinners.repo";

export async function deleteSpecWinner(supabase: DBClient, id: string): Promise<Result<true>> {
    return deleteSpecWinnerById(supabase, id);
}
