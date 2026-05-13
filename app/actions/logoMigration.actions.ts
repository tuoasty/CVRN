"use server";

import { supabaseAdmin } from "@/server/supabase/admin";
import { processLogoBackground, processLogoBackgroundAggressive } from "@/server/storage/imageProcessing";
import { BUCKETS, extractStoragePath, STORAGE_PATHS } from "@/server/storage/storage.paths";
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

        return Ok({ processedBase64: result.buffer.toString("base64"), bgRemoved: result.bgRemoved });
    } catch (error) {
        return Err(serializeError(error));
    }
}

export async function previewLogoProcessingAggressive(
    logoUrl: string
): Promise<Result<{ processedBase64: string; bgRemoved: boolean }>> {
    try {
        const resp = await fetch(logoUrl);
        if (!resp.ok) return Err({ message: "Failed to fetch logo", name: "FetchError", code: "INTEGRATION_ERROR" });

        const buffer = Buffer.from(await resp.arrayBuffer());
        const result = await processLogoBackgroundAggressive(buffer);

        return Ok({ processedBase64: result.buffer.toString("base64"), bgRemoved: result.bgRemoved });
    } catch (error) {
        return Err(serializeError(error));
    }
}

async function applyProcessedLogo(
    teamId: string,
    oldLogoUrl: string,
    processedBuffer: Buffer
): Promise<Result<true>> {
    const newPath = STORAGE_PATHS.teamLogoVersioned(teamId, "webp");

    const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKETS.PUBLIC)
        .upload(newPath, processedBuffer, { contentType: "image/webp", upsert: false });

    if (uploadError) return Err(serializeError(uploadError, "DB_ERROR"));

    const { data: urlData } = supabaseAdmin.storage.from(BUCKETS.PUBLIC).getPublicUrl(newPath);
    const newLogoUrl = urlData.publicUrl;

    const { error: dbError } = await supabaseAdmin
        .from("teams")
        .update({ logo_url: newLogoUrl, logo_bg_removed: true })
        .eq("id", teamId);

    if (dbError) return Err(serializeError(dbError, "DB_ERROR"));

    const oldPath = extractStoragePath(oldLogoUrl, BUCKETS.PUBLIC);
    await supabaseAdmin.storage.from(BUCKETS.PUBLIC).remove([oldPath]);

    return Ok(true);
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

        return applyProcessedLogo(teamId, logoUrl, result.buffer);
    } catch (error) {
        return Err(serializeError(error));
    }
}

export async function applyLogoProcessingAggressive(
    teamId: string,
    logoUrl: string
): Promise<Result<true>> {
    try {
        const resp = await fetch(logoUrl);
        if (!resp.ok) return Err({ message: "Failed to fetch logo", name: "FetchError", code: "INTEGRATION_ERROR" });

        const buffer = Buffer.from(await resp.arrayBuffer());
        const result = await processLogoBackgroundAggressive(buffer);

        if (!result.bgRemoved) {
            return Err({ message: "Logo background could not be removed", name: "NotProcessable", code: "VALIDATION_ERROR" });
        }

        return applyProcessedLogo(teamId, logoUrl, result.buffer);
    } catch (error) {
        return Err(serializeError(error));
    }
}
