import { DBClient, UpdateLogImage } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'

export async function findUpdateLogImagesByLogId(supabase: DBClient, updateLogId: string): Promise<Result<UpdateLogImage[]>> {
    const { data, error } = await supabase
        .from('update_log_images')
        .select('*')
        .eq('update_log_id', updateLogId)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as UpdateLogImage[])
}
