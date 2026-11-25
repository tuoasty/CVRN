"use server"

import {Err, Result} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {requireGroups} from "@/server/domains/auth";
import {
    getPickemBoard,
    PickemSeasonSchema,
    PickemSettingsSchema,
    publishPickemMatches,
    PublishPickemsSchema,
    updatePickemSettings,
} from "@/server/domains/pickem";
import type {PickemBoard, PickemSettings} from "@/server/domains/pickem";

export async function getPickemBoardAction(input: unknown): Promise<Result<PickemBoard>> {
    const parsed = PickemSeasonSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin"]);
    if (!guard.ok) return guard;

    return getPickemBoard(supabase, parsed.data.seasonId);
}

export async function publishPickemMatchesAction(input: unknown): Promise<Result<PickemBoard>> {
    const parsed = PublishPickemsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin"], {action: "publishPickemMatches", target: parsed.data});
    if (!guard.ok) return guard;

    return publishPickemMatches(supabase, parsed.data);
}

export async function updatePickemSettingsAction(input: unknown): Promise<Result<PickemSettings>> {
    const parsed = PickemSettingsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin"], {action: "updatePickemSettings", target: parsed.data});
    if (!guard.ok) return guard;

    return updatePickemSettings(supabase, parsed.data, guard.value.userId);
}
