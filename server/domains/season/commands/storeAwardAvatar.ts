import {getSupabaseAdmin} from "@/server/supabase/admin";
import {BUCKETS, STORAGE_PATHS} from "@/server/storage/storage.paths";
import {Ok, Err, Result} from "@/shared/types/result";
import {logger} from "@/server/utils/logger";
import {serializeError} from "@/server/utils/serializeableError";
import {toCdnUrl} from "@/server/storage/toCdnUrl";

export async function storeAwardAvatar(
    awardId: string,
    robloxCdnUrl: string
): Promise<Result<{url: string; path: string}>> {
    try {
        const response = await fetch(robloxCdnUrl);
        if (!response.ok) {
            return Err({message: "Failed to fetch avatar from Roblox CDN", code: "INTEGRATION_ERROR"});
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const path = STORAGE_PATHS.awardAvatar(awardId);
        const supabaseAdmin = getSupabaseAdmin();

        const {error: uploadError} = await supabaseAdmin.storage
            .from(BUCKETS.PUBLIC)
            .upload(path, buffer, {contentType: "image/png", cacheControl: "31536000", upsert: true});

        if (uploadError) {
            logger.error({error: uploadError, awardId}, "storeAwardAvatar: upload failed");
            return Err(serializeError(uploadError, "INTEGRATION_ERROR"));
        }

        const {data: {publicUrl}} = supabaseAdmin.storage.from(BUCKETS.PUBLIC).getPublicUrl(path);
        const versionedUrl = `${toCdnUrl(publicUrl)}?t=${Date.now()}`;

        const {error: updateError} = await supabaseAdmin
            .from("season_awards")
            .update({
                full_avatar_url: versionedUrl,
                avatar_bucket_path: path
            })
            .eq("id", awardId);
        if (updateError) {
            logger.error({error: updateError, awardId}, "storeAwardAvatar: DB update failed");
            return Err(serializeError(updateError, "DB_ERROR"));
        }

        return Ok({url: publicUrl, path});
    } catch (error) {
        logger.error({error, awardId}, "storeAwardAvatar: unexpected error");
        return Err(serializeError(error));
    }
}
