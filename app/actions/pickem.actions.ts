"use server"

import {Err, Result} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {requireGroups} from "@/server/domains/auth";
import {
    getPickemBoard,
    getPickemMatchSettlement,
    PickemMatchSchema,
    PickemSeasonSchema,
    PickemSettingsSchema,
    previewPickemSettlement,
    publishPickemMatches,
    PublishPickemsSchema,
    refundPickemMarkets,
    RefundPickemsSchema,
    settlePickemMatches,
    SettlePickemsSchema,
    updatePickemSettings,
} from "@/server/domains/pickem";
import type {PickemBoard, PickemMatchSettlement, PickemSettings, PickemSettlePreview} from "@/server/domains/pickem";

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

export async function previewPickemSettlementAction(input: unknown): Promise<Result<PickemSettlePreview>> {
    const parsed = SettlePickemsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin"]);
    if (!guard.ok) return guard;

    return previewPickemSettlement(supabase, parsed.data);
}

export async function settlePickemMatchesAction(input: unknown): Promise<Result<PickemBoard>> {
    const parsed = SettlePickemsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin"], {action: "settlePickemMatches", target: parsed.data});
    if (!guard.ok) return guard;

    return settlePickemMatches(supabase, parsed.data);
}

export async function refundPickemMarketsAction(input: unknown): Promise<Result<PickemBoard>> {
    const parsed = RefundPickemsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin"], {action: "refundPickemMarkets", target: parsed.data});
    if (!guard.ok) return guard;

    return refundPickemMarkets(supabase, parsed.data);
}

export async function getPickemMatchSettlementAction(input: unknown): Promise<Result<PickemMatchSettlement>> {
    const parsed = PickemMatchSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin"]);
    if (!guard.ok) return guard;

    return getPickemMatchSettlement(supabase, parsed.data.matchId);
}
