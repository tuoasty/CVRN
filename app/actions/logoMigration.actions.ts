"use server";

import { supabaseAdmin } from "@/server/supabase/admin";
import { processLogoBackground } from "@/server/storage/imageProcessing";
import { BUCKETS, extractStoragePath } from "@/server/storage/storage.paths";
import { Ok, Err, Result } from "@/shared/types/result";
import { serializeError } from "@/server/utils/serializeableError";

export type TeamForMigration = {
    id: string;
    name: string;
    logo_url: string | null;
    logo_bg_removed: boolean;
};

export async function getAllTeamsForMigration(): Promise<Result<TeamForMigration[]>> {
    try {
        const { data, error } = await supabaseAdmin
            .from("teams")
            .select("id, name, logo_url, logo_bg_removed")
            .is("deleted_at", null)
            .eq("is_bye", false)
            .not("logo_url", "is", null)
            .order("name", { ascending: true });

        if (error) return Err(serializeError(error, "DB_ERROR"));
        return Ok((data ?? []) as TeamForMigration[]);
    } catch (error) {
        return Err(serializeError(error));
    }
}

export async function previewLogoProcessing(
    logoUrl: string
): Promise<Result<{ processedBase64: string; bgRemoved: boolean }>> {
    try {
        const resp = await fetch(logoUrl);
        if (!resp.ok) return Err({ message: "Failed to fetch logo", name: "FetchError", code: "INTEGRATION_ERROR" });

        const buffer = Buffer.from(await resp.arrayBuffer());
        const result = await processLogoBackground(buffer);
        const processedBase64 = result.buffer.toString("base64");

        return Ok({ processedBase64, bgRemoved: result.bgRemoved });
    } catch (error) {
        return Err(serializeError(error));
    }
}

export async function applyLogoProcessing(
    teamId: string,
    logoUrl: string
): Promise<Result<true>> {
    try {
        const resp = await fetch(logoUrl);
        if (!resp.ok) return Err({ message: "Failed to fetch logo", name: "FetchError", code: "INTEGRATION_ERROR" });

        const buffer = Buffer.from(await resp.arrayBuffer());
        const result = await processLogoBackground(buffer);

        if (!result.bgRemoved) {
            return Err({ message: "Logo background could not be removed", name: "NotProcessable", code: "VALIDATION_ERROR" });
        }

        const storagePath = extractStoragePath(logoUrl, BUCKETS.PUBLIC);

        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKETS.PUBLIC)
            .upload(storagePath, result.buffer, {
                contentType: "image/webp",
                upsert: true,
            });

        if (uploadError) return Err(serializeError(uploadError, "DB_ERROR"));

        const { error: dbError } = await supabaseAdmin
            .from("teams")
            .update({ logo_bg_removed: true })
            .eq("id", teamId);

        if (dbError) return Err(serializeError(dbError, "DB_ERROR"));

        return Ok(true);
    } catch (error) {
        return Err(serializeError(error));
    }
}
