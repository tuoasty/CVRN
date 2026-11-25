import {
    AckPayoutsBodySchema,
    AckPayoutsResponseSchema,
    PayoutsQuerySchema,
    PayoutsResponseSchema,
    OpenPickemsQuerySchema,
    OpenPickemsResponseSchema,
    PickErrorSchema,
    PlacePickBodySchema,
    PlacePickResponseSchema,
    type AckPayoutsBody,
    type AckPayoutsResponse,
    type PayoutsResponse,
    type OpenPickemsResponse,
    type PickErrorBody,
    type PlacePickBody,
    type PlacePickResponse,
} from "@/server/domains/pickem/types/gameSchemas";
import {GAME_API_SECURITY} from "./gameApi";
import type {OpenApiOperation, OpenApiPaths, OpenApiResponse} from "./types";
import {UNAUTHORIZED_RESPONSE, jsonRequestBody, jsonResponse, queryParam} from "./zodSchema";

export const PICKEMS_API_TAG = "Pickems";

const ROBLOX_USER_ID = "4605123630";
const WINNER_MARKET_ID = "3f6d1c2a-8b4e-4f1a-9c7d-5e2b1a0f9d31";
const LENGTH_MARKET_ID = "8a2e4b6c-1d3f-4a5b-8c7d-9e0f1a2b3c4d";

export const OPEN_PICKEMS_EXAMPLE = {
    server_time: "2026-11-25T12:00:00.000Z",
    stake_min: 1,
    stake_max: 1000,
    pickems: [{
        match_id: "c1a2b3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        match_code: "W4-M2",
        match_type: "season",
        region: "NA",
        season_number: 3,
        best_of: 3,
        scheduled_at: "2026-11-26T18:00:00+00:00",
        lock_at: "2026-11-26T18:00:00+00:00",
        locked: false,
        home: {id: "f1de9a5d-323c-4df6-95ba-c2204467bd24", name: "Saints", logo_url: "https://cdn.cvrn.net/public-assets/logos/saints.png"},
        away: {id: "71fc4973-e0d6-4d87-97dc-7d010c069aef", name: "Mapua", logo_url: null},
        markets: [
            {
                market_id: WINNER_MARKET_ID,
                kind: "winner",
                label: "Winner",
                line: null,
                pool: 300,
                outcomes: [
                    {key: "home", label: "Saints", odds: 1.45},
                    {key: "away", label: "Mapua", odds: 2.73},
                ],
                my_pick: {pick_id: "5b7c9d1e-2f3a-4b5c-8d6e-7f8a9b0c1d2e", outcome: "home", stake: 300},
            },
            {
                market_id: LENGTH_MARKET_ID,
                kind: "match_length",
                label: "Match length",
                line: null,
                pool: 0,
                outcomes: [
                    {key: "2-0", label: "2-0", odds: 1.9},
                    {key: "2-1", label: "2-1", odds: 1.9},
                ],
                my_pick: null,
            },
        ],
    }],
} satisfies OpenPickemsResponse;

export const PLACE_PICK_BODY_EXAMPLE = {
    request_id: "0d9e8f7a-6b5c-4d3e-9f2a-1b0c9d8e7f6a",
    roblox_user_id: ROBLOX_USER_ID,
    market_id: WINNER_MARKET_ID,
    outcome: "home",
    stake: 300,
} satisfies PlacePickBody;

export const PLACE_PICK_EXAMPLE = {
    pick: {pick_id: "5b7c9d1e-2f3a-4b5c-8d6e-7f8a9b0c1d2e", market_id: WINNER_MARKET_ID, outcome: "home", stake: 300},
    charged: 300,
    replayed: false,
    pool: 300,
    outcomes: [
        {key: "home", label: "Saints", odds: 1.45},
        {key: "away", label: "Mapua", odds: 2.73},
    ],
} satisfies PlacePickResponse;

const SAINTS = {id: "f1de9a5d-323c-4df6-95ba-c2204467bd24", name: "Saints", logo_url: "https://cdn.cvrn.net/public-assets/logos/saints.png"};
const MAPUA = {id: "71fc4973-e0d6-4d87-97dc-7d010c069aef", name: "Mapua", logo_url: null};
const WIN_PICK_ID = "5b7c9d1e-2f3a-4b5c-8d6e-7f8a9b0c1d2e";
const LOSS_PICK_ID = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";
const REFUND_PICK_ID = "2e4f6a8b-0c1d-4e3f-9a5b-7c9d1e3f5a7b";

export const PAYOUTS_EXAMPLE = {
    payouts: [
        {
            pick_id: WIN_PICK_ID,
            match_id: "c1a2b3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
            match_code: "W4-M2",
            home: SAINTS,
            away: MAPUA,
            market_id: WINNER_MARKET_ID,
            kind: "winner",
            label: "Winner",
            outcome: "home",
            outcome_label: "Saints",
            result_outcome: "home",
            stake: 300,
            final_odds: 1.38,
            result: "win",
            payout: 414,
        },
        {
            pick_id: LOSS_PICK_ID,
            match_id: "c1a2b3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
            match_code: "W4-M2",
            home: SAINTS,
            away: MAPUA,
            market_id: LENGTH_MARKET_ID,
            kind: "match_length",
            label: "Match length",
            outcome: "2-0",
            outcome_label: "2-0",
            result_outcome: "2-1",
            stake: 100,
            final_odds: 1.72,
            result: "loss",
            payout: 0,
        },
        {
            pick_id: REFUND_PICK_ID,
            match_id: "d2b3c4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
            match_code: "W4-M3",
            home: MAPUA,
            away: SAINTS,
            market_id: "4b5c6d7e-8f9a-4b0c-9d1e-2f3a4b5c6d7e",
            kind: "winner",
            label: "Winner",
            outcome: "away",
            outcome_label: "Saints",
            result_outcome: null,
            stake: 250,
            final_odds: null,
            result: "refund",
            payout: 250,
        },
    ],
    has_more: false,
} satisfies PayoutsResponse;

export const ACK_PAYOUTS_BODY_EXAMPLE = {
    roblox_user_id: ROBLOX_USER_ID,
    pick_ids: [WIN_PICK_ID, LOSS_PICK_ID, REFUND_PICK_ID],
} satisfies AckPayoutsBody;

export const ACK_PAYOUTS_EXAMPLE = {
    claimed_pick_ids: [WIN_PICK_ID, LOSS_PICK_ID, REFUND_PICK_ID],
} satisfies AckPayoutsResponse;

function pickError(description: string, example: PickErrorBody): OpenApiResponse {
    return jsonResponse(description, PickErrorSchema, example);
}

function operation(op: Omit<OpenApiOperation, "tags" | "security">): OpenApiOperation {
    return {tags: [PICKEMS_API_TAG], security: [{[GAME_API_SECURITY]: []}], ...op};
}

const serverError = pickError("Database failure. Safe to retry with the same `request_id`.", {error: "Failed to save the pick", code: "DB_ERROR"});

export const PICKEMS_API_PATHS: OpenApiPaths = {
    "/api/pickems/open": {
        get: operation({
            operationId: "getOpenPickems",
            summary: "Published matches and their markets",
            description: [
                "Every published match that has not been settled yet, in all regions, soonest first.",
                "",
                "- **Render markets generically.** A market is a `label` plus 2 or 3 `outcomes` (`key`, `label`, `odds`). New kinds, such as playoff player markets with a `line`, arrive in this same shape, so do not hard-code `kind` values.",
                "- **Odds move with every pick until lock.** The odds at lock are the ones paid. Show them as \"final at lock\".",
                "- **Lock.** Picks close at `lock_at` (the scheduled start). `locked` is already worked out against `server_time`; use `server_time`, not the game clock, for countdowns. Locked matches stay listed until they are settled.",
                "- `my_pick` is the player's current pick on that market when `roblox_user_id` is sent, otherwise `null`.",
                "- `stake_min` and `stake_max` bound the player's **total** stake on one market.",
                "- `home` or `away` can be `null` if a playoff slot was reset after publishing. Treat that match as locked.",
            ].join("\n"),
            parameters: [
                queryParam(
                    "roblox_user_id",
                    OpenPickemsQuerySchema.shape.roblox_user_id.unwrap(),
                    "Roblox user id, digits only. Fills `my_pick`. Optional.",
                    ROBLOX_USER_ID,
                    false,
                ),
            ],
            responses: {
                "200": jsonResponse("Open and locked-but-unsettled pickems.", OpenPickemsResponseSchema, OPEN_PICKEMS_EXAMPLE),
                "400": pickError("`roblox_user_id` is not digits.", {
                    error: "Invalid request",
                    code: "INVALID_REQUEST",
                    issues: [{field: "roblox_user_id", message: "roblox_user_id must be digits"}],
                }),
                "401": UNAUTHORIZED_RESPONSE,
                "500": pickError("Database failure. Safe to retry.", {error: "Failed to read data", code: "DB_ERROR"}),
            },
        }),
    },
    "/api/pickems/picks": {
        put: operation({
            operationId: "placePick",
            summary: "Place, switch or raise a pick",
            description: [
                "Sets the player's pick on one market. Call it from the game server only.",
                "",
                "- **`stake` is the player's new total on this market**, not an amount to add. The first pick charges the full stake. After that the player may switch outcome and may raise the total, never lower it. `charged` is the difference to take from the player: `0` for a pure switch.",
                "- **Deduct exactly `charged`, and only after a `200`.** Never deduct on an error.",
                "- **`request_id`** is a new unique id (a UUID) per attempt. Store it with the pending pick before sending, then retry with the same id after a timeout or a server restart. A retry of the last request returns the stored result with `replayed: true` and the same `charged`, so it is never charged twice.",
                "- Send one request per player at a time and wait for its answer before the next.",
                "- `outcomes` and `pool` show the market after the pick. They come back empty if the odds could not be read; the pick still stands, so refresh with `GET /api/pickems/open`.",
            ].join("\n"),
            requestBody: jsonRequestBody(PlacePickBodySchema, PLACE_PICK_BODY_EXAMPLE),
            responses: {
                "200": jsonResponse("The pick as stored, what to charge, and the market's odds after it.", PlacePickResponseSchema, PLACE_PICK_EXAMPLE),
                "400": pickError("The body failed validation (`INVALID_REQUEST`), the outcome is not in this market (`OUTCOME_NOT_FOUND`), or the stake is outside `stake_min`..`stake_max` (`STAKE_OUT_OF_RANGE`).", {
                    error: "Stake must be between 1 and 1000",
                    code: "STAKE_OUT_OF_RANGE",
                }),
                "401": UNAUTHORIZED_RESPONSE,
                "404": pickError("No market has this `market_id`.", {error: "Market not found", code: "MARKET_NOT_FOUND"}),
                "409": pickError("The market is locked, settled or refunded (`MARKET_LOCKED`), or the new total is below the current stake (`STAKE_LOWERED`).", {
                    error: "Market is locked",
                    code: "MARKET_LOCKED",
                }),
                "500": serverError,
            },
        }),
    },
    "/api/pickems/payouts": {
        get: operation({
            operationId: "getPickemPayouts",
            summary: "Settled picks waiting to be credited",
            description: [
                "Every pick of this player whose market was settled or refunded and that has not been acked yet, oldest first, at most 100 per call.",
                "",
                "- **`payout` is the amount to credit.** `win` pays `floor(stake × final_odds)`, `loss` pays `0`, `refund` returns the stake. Losses are listed too so the game can show the result; they credit nothing.",
                "- **Claim in two steps.** 1) Call this endpoint. 2) Credit the total `payout` and record every `pick_id` in the same DataStore write (`UpdateAsync`). 3) Call `POST /api/pickems/payouts/ack` with those ids.",
                "- **Skip ids already recorded.** If the game crashed between the DataStore write and the ack, the same picks come back next time. Credit only ids that are not in the player's record, then ack them all again.",
                "- `has_more: true` means more are waiting. Ack this page, then call again.",
                "- A good moment to call: when the player joins and when they open the pickems screen.",
            ].join("\n"),
            parameters: [
                queryParam("roblox_user_id", PayoutsQuerySchema.shape.roblox_user_id, "Roblox user id, digits only.", ROBLOX_USER_ID),
            ],
            responses: {
                "200": jsonResponse("Unclaimed results for this player.", PayoutsResponseSchema, PAYOUTS_EXAMPLE),
                "400": pickError("`roblox_user_id` is missing or not digits.", {
                    error: "Invalid request",
                    code: "INVALID_REQUEST",
                    issues: [{field: "roblox_user_id", message: "roblox_user_id must be digits"}],
                }),
                "401": UNAUTHORIZED_RESPONSE,
                "500": pickError("Database failure. Safe to retry.", {error: "Failed to read payouts", code: "DB_ERROR"}),
            },
        }),
    },
    "/api/pickems/payouts/ack": {
        post: operation({
            operationId: "ackPickemPayouts",
            summary: "Mark payouts as credited",
            description: [
                "Marks picks as claimed so they stop coming back from `GET /api/pickems/payouts`. Call it only after the DataStore write that credited them has succeeded.",
                "",
                "- Send the `pick_id`s exactly as received, at most 100 per call.",
                "- **Safe to repeat.** Ids that are already claimed, belong to another player, or are not settled yet are ignored. `claimed_pick_ids` lists only the ids this call marked, so a retry after a timeout returns fewer or none; that is not an error.",
            ].join("\n"),
            requestBody: jsonRequestBody(AckPayoutsBodySchema, ACK_PAYOUTS_BODY_EXAMPLE),
            responses: {
                "200": jsonResponse("The ids this call marked as claimed.", AckPayoutsResponseSchema, ACK_PAYOUTS_EXAMPLE),
                "400": pickError("The body failed validation.", {
                    error: "Invalid request",
                    code: "INVALID_REQUEST",
                    issues: [{field: "pick_ids", message: "pick_ids needs at least one id"}],
                }),
                "401": UNAUTHORIZED_RESPONSE,
                "500": pickError("Database failure. Safe to retry with the same ids.", {error: "Failed to record the claim", code: "DB_ERROR"}),
            },
        }),
    },
};
