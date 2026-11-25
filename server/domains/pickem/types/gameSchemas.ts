import {z} from "zod";

const RobloxUserId = z.string().regex(/^[0-9]{1,20}$/, "roblox_user_id must be digits");

export const PICK_ERROR_CODES = [
    "INVALID_REQUEST",
    "MARKET_NOT_FOUND",
    "MARKET_LOCKED",
    "OUTCOME_NOT_FOUND",
    "STAKE_OUT_OF_RANGE",
    "STAKE_LOWERED",
] as const;
export type PickErrorCode = typeof PICK_ERROR_CODES[number];

export const OpenPickemsQuerySchema = z.object({
    roblox_user_id: RobloxUserId.optional(),
});

export const PlacePickBodySchema = z.object({
    request_id: z.string().min(1, "request_id is required").max(100, "request_id must be 100 characters or fewer"),
    roblox_user_id: RobloxUserId,
    market_id: z.uuid("market_id must be a UUID"),
    outcome: z.string().min(1, "outcome is required").max(20),
    stake: z.number().int("stake must be a whole number").positive("stake must be positive"),
});
export type PlacePickBody = z.infer<typeof PlacePickBodySchema>;

const GameTeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    logo_url: z.string().nullable(),
});

const GameOutcomeSchema = z.object({
    key: z.string(),
    label: z.string(),
    odds: z.number(),
});

const GamePickSchema = z.object({
    pick_id: z.string(),
    outcome: z.string(),
    stake: z.number().int(),
});

const GameMarketSchema = z.object({
    market_id: z.string(),
    kind: z.string(),
    label: z.string(),
    line: z.number().nullable(),
    pool: z.number().int(),
    outcomes: z.array(GameOutcomeSchema),
    my_pick: GamePickSchema.nullable(),
});
export type GameMarket = z.infer<typeof GameMarketSchema>;

const GamePickemSchema = z.object({
    match_id: z.string(),
    match_code: z.string().nullable(),
    match_type: z.enum(["season", "playoffs"]),
    region: z.string().nullable(),
    season_number: z.number().int().nullable(),
    best_of: z.number().int(),
    scheduled_at: z.string().nullable(),
    lock_at: z.string().nullable(),
    locked: z.boolean(),
    home: GameTeamSchema.nullable(),
    away: GameTeamSchema.nullable(),
    markets: z.array(GameMarketSchema),
});
export type GamePickem = z.infer<typeof GamePickemSchema>;

export const OpenPickemsResponseSchema = z.object({
    server_time: z.string(),
    stake_min: z.number().int(),
    stake_max: z.number().int(),
    pickems: z.array(GamePickemSchema),
});
export type OpenPickemsResponse = z.infer<typeof OpenPickemsResponseSchema>;

export const PlacePickResponseSchema = z.object({
    pick: GamePickSchema.extend({market_id: z.string()}),
    charged: z.number().int(),
    replayed: z.boolean(),
    pool: z.number().int(),
    outcomes: z.array(GameOutcomeSchema),
});
export type PlacePickResponse = z.infer<typeof PlacePickResponseSchema>;

export const PickErrorSchema = z.object({
    error: z.string(),
    code: z.enum([...PICK_ERROR_CODES, "DB_ERROR"]),
    issues: z.array(z.object({field: z.string(), message: z.string()})).optional(),
});
export type PickErrorBody = z.infer<typeof PickErrorSchema>;

export const PAYOUTS_PAGE_SIZE = 100;

export const PayoutsQuerySchema = z.object({
    roblox_user_id: RobloxUserId,
});

const GamePayoutSchema = z.object({
    pick_id: z.string(),
    match_id: z.string(),
    match_code: z.string().nullable(),
    home: GameTeamSchema.nullable(),
    away: GameTeamSchema.nullable(),
    market_id: z.string(),
    kind: z.string(),
    label: z.string(),
    outcome: z.string(),
    outcome_label: z.string(),
    result_outcome: z.string().nullable(),
    stake: z.number().int(),
    final_odds: z.number().nullable(),
    result: z.enum(["win", "loss", "refund"]),
    payout: z.number().int(),
});
export type GamePayout = z.infer<typeof GamePayoutSchema>;

export const PayoutsResponseSchema = z.object({
    payouts: z.array(GamePayoutSchema),
    has_more: z.boolean(),
});
export type PayoutsResponse = z.infer<typeof PayoutsResponseSchema>;

export const AckPayoutsBodySchema = z.object({
    roblox_user_id: RobloxUserId,
    pick_ids: z.array(z.uuid("pick_ids must be UUIDs")).min(1, "pick_ids needs at least one id").max(PAYOUTS_PAGE_SIZE, `pick_ids takes at most ${PAYOUTS_PAGE_SIZE} ids`),
});
export type AckPayoutsBody = z.infer<typeof AckPayoutsBodySchema>;

export const AckPayoutsResponseSchema = z.object({
    claimed_pick_ids: z.array(z.string()),
});
export type AckPayoutsResponse = z.infer<typeof AckPayoutsResponseSchema>;
