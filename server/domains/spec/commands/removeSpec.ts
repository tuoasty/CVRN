import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {deleteSpec} from "@/server/db/specs.repo";

export async function removeSpec(supabase: DBClient, id: string): Promise<Result<true>> {
    return deleteSpec(supabase, id);
}
