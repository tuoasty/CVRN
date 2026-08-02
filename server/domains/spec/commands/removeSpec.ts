import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {deleteSpec} from "@/server/db/specs.repo";

// Requirements go with it via ON DELETE CASCADE. Once spec_holdings exists this
// needs a guard — deleting a spec someone holds would orphan the award.
export async function removeSpec(supabase: DBClient, id: string): Promise<Result<true>> {
    return deleteSpec(supabase, id);
}
