import {z} from "zod";

export const PICKEM_MARKET_KINDS = ["winner", "match_length"] as const;
export const PICKEM_PUBLISH_LIMIT = 50;
export const PICKEM_SETTLE_LIMIT = 50;

export const PickemSeasonSchema = z.object({
    seasonId: z.uuid("Pick a season"),
});
export type PickemSeasonInput = z.infer<typeof PickemSeasonSchema>;

export const PublishPickemsSchema = z.object({
    seasonId: z.uuid("Pick a season"),
    matchIds: z.array(z.uuid()).min(1, "Pick at least one match").max(PICKEM_PUBLISH_LIMIT, `Publish at most ${PICKEM_PUBLISH_LIMIT} matches at once`)
        .refine(ids => new Set(ids).size === ids.length, {message: "Each match can only appear once"}),
});
export type PublishPickemsInput = z.infer<typeof PublishPickemsSchema>;

export const PickemSettingsSchema = z.object({
    seed: z.number().int("Seed must be a whole number").min(1, "Seed must be at least 1").max(1_000_000, "Seed must be 1,000,000 or lower"),
    rake: z.number().min(0, "Rake cannot be negative").max(0.5, "Rake must be 0.5 or lower"),
    oddsFloor: z.number().min(1, "Odds floor must be at least 1.00").max(2, "Odds floor must be 2.00 or lower"),
    sigma: z.number().min(0.5, "Sigma must be at least 0.5").max(50, "Sigma must be 50 or lower"),
    shrinkSets: z.number().min(0, "Shrinkage cannot be negative").max(100, "Shrinkage must be 100 or lower"),
    probClamp: z.number().min(0.001, "Clamp must be at least 0.001").max(0.2, "Clamp must be 0.2 or lower"),
    stakeMin: z.number().int("Minimum stake must be a whole number").min(1, "Minimum stake must be at least 1").max(1_000_000, "Minimum stake must be 1,000,000 or lower"),
    stakeMax: z.number().int("Maximum stake must be a whole number").min(1, "Maximum stake must be at least 1").max(1_000_000, "Maximum stake must be 1,000,000 or lower"),
}).refine(s => s.stakeMax >= s.stakeMin, {message: "Maximum stake must be at least the minimum", path: ["stakeMax"]});
export type PickemSettingsInput = z.infer<typeof PickemSettingsSchema>;

const uniqueIds = (ids: string[]) => new Set(ids).size === ids.length;

export const SettlePickemsSchema = z.object({
    seasonId: z.uuid("Pick a season"),
    matchIds: z.array(z.uuid()).min(1, "Pick at least one match").max(PICKEM_SETTLE_LIMIT, `Settle at most ${PICKEM_SETTLE_LIMIT} matches at once`)
        .refine(uniqueIds, {message: "Each match can only appear once"}),
});
export type SettlePickemsInput = z.infer<typeof SettlePickemsSchema>;

export const RefundPickemsSchema = z.object({
    seasonId: z.uuid("Pick a season"),
    marketIds: z.array(z.uuid()).min(1, "Pick at least one market").max(100, "Refund at most 100 markets at once")
        .refine(uniqueIds, {message: "Each market can only appear once"}),
});
export type RefundPickemsInput = z.infer<typeof RefundPickemsSchema>;

export const PickemMatchSchema = z.object({
    matchId: z.uuid("Pick a match"),
});
export type PickemMatchInput = z.infer<typeof PickemMatchSchema>;
