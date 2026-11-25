import {z} from "zod";
import {
    PlayerDetailApiResponseSchema,
    PlayerStatsResponseSchema,
    RawStatSummaryResponseSchema,
    RobloxIdParamSchema,
    SeasonQuerySchema,
    type PlayerDetailApiResponse,
    type PlayerStatsResponse,
    type RawStatSummaryResponse,
} from "@/server/domains/player/types/schemas";
import {ChampionArchiveResponseSchema, SeasonNumberQuerySchema, type ChampionArchiveResponse} from "@/server/domains/season/types/schemas";
import {BoosterListResponseSchema} from "@/server/domains/booster/types/schemas";
import type {OpenApiOperation, OpenApiPaths, OpenApiResponse} from "./types";
import {UNAUTHORIZED_RESPONSE, errorResponse, jsonResponse, pathParam, queryParam} from "./zodSchema";

export const GAME_API_TAG = "Game";
export const GAME_API_SECURITY = "gameApiSecret";

const ROBLOX_ID = "4605123630";

const robloxIdParam = pathParam(
    "robloxId",
    RobloxIdParamSchema.shape.robloxId,
    "Roblox user id, digits only.",
    ROBLOX_ID,
);

const seasonOrAllParam = queryParam(
    "season",
    SeasonQuerySchema,
    "Season number (`3`), `current` for the latest season that has started, or `all` for every season.",
    "all",
);

const seasonParam = queryParam(
    "season",
    SeasonNumberQuerySchema.shape.season,
    "Season number (`3`) or `current` for the latest season that has started.",
    "2",
);

const invalidRequest = errorResponse("The id or season failed validation.", {
    error: "Invalid request",
    code: "VALIDATION_ERROR",
});

const serverError = errorResponse("Database failure. Safe to retry later.", {
    error: "Failed to read data",
    code: "DB_ERROR",
});

const noCurrentSeason = errorResponse("`season=current` was sent and no season has started yet.", {
    error: "No current season found",
    code: "NOT_FOUND",
});

const playerNotFound = errorResponse(
    "No league player has this Roblox id, or `season=current` found no started season.",
    {error: "Player not found", code: "NOT_FOUND"},
);

function operation(op: Omit<OpenApiOperation, "tags" | "security"> & {responses: Record<string, OpenApiResponse>}): OpenApiOperation {
    return {tags: [GAME_API_TAG], security: [{[GAME_API_SECURITY]: []}], ...op};
}

export const PLAYER_STATS_EXAMPLE = {
    roblox_user_id: "4605123630",
    sets_played: 27.5,
    points_per_set: 5.387,
    scoring_rank: 0.98805256869773,
    spiking_rank: 0.980884109916368,
    setting_rank: 0.921146953405018,
    receiving_rank: 0.90442054958184,
    blocking_rank: 0.740740740740741,
    serving_rank: 0.966547192353644,
    spiking: {
        ape_kills: 16,
        ape_attempts: 43,
        delay_kills: 39,
        quick_kills: 59,
        wipes_tools: 10,
        kill_attempts: 257,
        spiking_errors: 20,
        kills_per_set: 4.604
    },
    setting: {
        assists: 9,
        setting_errors: 2,
        assists_per_set: 0.365
    },
    blocking: {
        kill_blocks: 4,
        block_touches: 28,
        blocks_per_set: 1.228
    },
    receiving: {
        receives: 107,
        digs: 68,
        block_follows: 30,
        dives: 5,
        receive_errors: 1,
        receives_per_set: 4.058,
        digs_per_set: 2.505
    },
    serving: {
        jump_serve_aces: 17,
        float_aces: 0,
        service_errors: 11,
        aces_per_set: 0.586,
        net_serve_per_set: 0.135
    }
} satisfies PlayerStatsResponse;

const PlayerDetailRouteResponseSchema = PlayerDetailApiResponseSchema.extend({is_booster: z.boolean()});

export const PLAYER_DETAIL_EXAMPLE = {
    achievements: [
        {
            season_id: "686b654e-1a57-4460-98a1-ed0bdf042bae",
            season_name: "Season 2",
            season_slug: "season-2",
            place: 1,
            place_end: 1,
            team_id: "f1de9a5d-323c-4df6-95ba-c2204467bd24",
            team_name: "Saints",
            team_slug: "saints",
            is_captain: false
        },
        {
            season_id: "df9b04fe-29a1-4833-b377-bd6ef4ecc8b2",
            season_name: "Season 1",
            season_slug: "season-1",
            place: 1,
            place_end: 1,
            team_id: "71fc4973-e0d6-4d87-97dc-7d010c069aef",
            team_name: "Mapua",
            team_slug: "mapua",
            is_captain: false
        }
    ],
    awards: [
        {
            award_name: "Opposite",
            category: "all_star",
            season_id: "686b654e-1a57-4460-98a1-ed0bdf042bae",
            season_name: "Season 2"
        },
        {
            award_name: "Best Opposite Hitter",
            category: "individual_winners",
            season_id: "686b654e-1a57-4460-98a1-ed0bdf042bae",
            season_name: "Season 2"
        },
        {
            award_name: "Most Valuable Player",
            category: "individual_winners",
            season_id: "686b654e-1a57-4460-98a1-ed0bdf042bae",
            season_name: "Season 2"
        },
        {
            award_name: "Opposite Hitter",
            category: "first_team",
            season_id: "df9b04fe-29a1-4833-b377-bd6ef4ecc8b2",
            season_name: "Season 1"
        },
        {
            award_name: "Best Opposite Hitter",
            category: "individual_winners",
            season_id: "df9b04fe-29a1-4833-b377-bd6ef4ecc8b2",
            season_name: "Season 1"
        },
        {
            award_name: "Finals MVP",
            category: "individual_winners",
            season_id: "df9b04fe-29a1-4833-b377-bd6ef4ecc8b2",
            season_name: "Season 1"
        },
        {
            award_name: "Most Valuable Player",
            category: "individual_winners",
            season_id: "df9b04fe-29a1-4833-b377-bd6ef4ecc8b2",
            season_name: "Season 1"
        }
    ],
    spec_awards: [
        {
            name: "Darlan Souza",
            position: "OPP",
            stars: 4,
            season_id: "686b654e-1a57-4460-98a1-ed0bdf042bae",
            season_name: "Season 2"
        },
        {
            name: "Darlan Souza",
            position: "OPP",
            stars: 4,
            season_id: "df9b04fe-29a1-4833-b377-bd6ef4ecc8b2",
            season_name: "Season 1"
        }
    ],
    is_booster: false
} satisfies PlayerDetailApiResponse & {is_booster: boolean};

export const STAT_SUMMARY_EXAMPLE = {
    sets_played: {
        min: 1,
        max: 38,
        mean: 6.88
    },
    points_per_set: {
        min: 0.094,
        max: 6.747,
        mean: 1.892
    },
    spiking: {
        ape_kills: {
            min: 0,
            max: 35,
            mean: 1.25
        },
        ape_attempts: {
            min: 0,
            max: 70,
            mean: 3.14
        },
        delay_kills: {
            min: 0,
            max: 39,
            mean: 1.69
        },
        quick_kills: {
            min: 0,
            max: 102,
            mean: 7.89
        },
        wipes_tools: {
            min: 0,
            max: 13,
            mean: 0.73
        },
        kill_attempts: {
            min: 0,
            max: 297,
            mean: 31.87
        },
        spiking_errors: {
            min: 0,
            max: 27,
            mean: 2.53
        },
        kills_per_set: {
            min: 0.074,
            max: 6.162,
            mean: 1.472
        },
        hit_pct: {
            min: -0.176,
            max: 0.632,
            mean: 0.272
        }
    },
    setting: {
        assists: {
            min: 0,
            max: 504,
            mean: 10.07
        },
        setting_errors: {
            min: 0,
            max: 40,
            mean: 1.06
        },
        assists_per_set: {
            min: 0.004,
            max: 14.355,
            mean: 1.077
        },
        set_pct: {
            min: 0.778,
            max: 1,
            mean: 0.906
        }
    },
    blocking: {
        kill_blocks: {
            min: 0,
            max: 35,
            mean: 1.45
        },
        block_touches: {
            min: 0,
            max: 170,
            mean: 7.01
        },
        blocks_per_set: {
            min: 0.027,
            max: 6.316,
            mean: 1.08
        },
        kb_pct: {
            min: 0,
            max: 0.571,
            mean: 0.164
        }
    },
    receiving: {
        receives: {
            min: 0,
            max: 154,
            mean: 20.52
        },
        digs: {
            min: 0,
            max: 91,
            mean: 9.69
        },
        block_follows: {
            min: 0,
            max: 66,
            mean: 5.73
        },
        dives: {
            min: 0,
            max: 41,
            mean: 2.05
        },
        receive_errors: {
            min: 0,
            max: 4,
            mean: 0.18
        },
        receives_per_set: {
            min: 0.286,
            max: 11.27,
            mean: 2.913
        },
        rec_pct: {
            min: 0.667,
            max: 1,
            mean: 0.975
        }
    },
    serving: {
        jump_serve_aces: {
            min: 0,
            max: 50,
            mean: 1.62
        },
        float_aces: {
            min: 0,
            max: 6,
            mean: 0.06
        },
        service_errors: {
            min: 0,
            max: 18,
            mean: 1.53
        },
        aces_per_set: {
            min: 0.027,
            max: 1.445,
            mean: 0.231
        }
    }
} satisfies RawStatSummaryResponse;

export const CHAMPION_ARCHIVE_EXAMPLE = {
    EU: {
        captain: "27836897",
        vice_capt: "535150928",
        court_cap: null,
        members: [
            "1106220001",
            "257630511",
            "183082350",
            "1203385596",
            "2417068843",
            "1909762608",
            "10693427240",
            "4162911445",
            "3720213406",
            "108612383"
        ]
    },
    NA: {
        captain: "96118596",
        vice_capt: "261193897",
        court_cap: "1934493244",
        members: [
            "1993351152",
            "414782754",
            "89558124",
            "1352320169",
            "607553694",
            "4811140994",
            "5688275275",
            "149652502",
            "1608020878",
            "95295728",
            "53001707",
            "345195663",
            "1079140875",
            "1337850996",
            "2688895932"
        ]
    },
    SA: {
        captain: "2439969564",
        vice_capt: "2431650052",
        court_cap: "1931385564",
        members: [
            "5375127366",
            "2462069699",
            "786408755",
            "1173742037",
            "3332626240",
            "322020872",
            "1487573328",
            "1524002796",
            "1000202576",
            "4793722645",
            "926300574",
            "482153568",
            "230413844",
            "1082456766"
        ]
    },
    AS: {
        captain: "26416056",
        vice_capt: "271850970",
        court_cap: "4605123630",
        members: [
            "11105798173",
            "498000377",
            "1959493159",
            "1677834254",
            "57445813",
            "1084804259",
            "1450973147",
            "402224957",
            "886071740",
            "1601605692",
            "3605901716",
            "1729768410",
            "25350124",
            "296656890",
            "1809417245"
        ]
    }
} satisfies ChampionArchiveResponse;

export const BOOSTERS_EXAMPLE = {
    roblox_user_ids: [
        "1049710421",
        "3146144561",
        "2053911521"
    ]
};

export const GAME_API_PATHS: OpenApiPaths = {
    "/api/player/{robloxId}/stats": {
        get: operation({
            operationId: "getPlayerStats",
            summary: "Player stat totals and category ranks",
            description: [
                "Raw stat totals for one player, per-set values and six category ranks.",
                "",
                "- Ranks are percentiles from 0 to 1, higher is better, pooled across all regions. `null` when the player has no stats in the chosen season.",
                "- Per-set values are adjusted toward the league average for players with few sets, so they can differ from total divided by sets.",
                "- `sets_played` counts a fifth set as half a set, so it can end in `.5`.",
            ].join("\n"),
            parameters: [robloxIdParam, seasonOrAllParam],
            responses: {
                "200": jsonResponse("Stats for the player in the chosen season.", PlayerStatsResponseSchema, PLAYER_STATS_EXAMPLE),
                "400": invalidRequest,
                "401": UNAUTHORIZED_RESPONSE,
                "404": playerNotFound,
                "500": serverError,
            },
        }),
    },
    "/api/player/{robloxId}/details": {
        get: operation({
            operationId: "getPlayerDetails",
            summary: "Player placements, awards and spec awards",
            description: [
                "Podium finishes, awards and spec awards for one player, plus whether they boost the CVR Discord server.",
                "",
                "- `achievements`: podium finishes. `place` to `place_end` is a shared range when teams tie for a place.",
                "- `awards`: only the categories `individual_winners`, `staff_team`, `first_team` and `all_star`.",
                "- `is_booster`: `false` when the booster list can't be read, never an error.",
            ].join("\n"),
            parameters: [robloxIdParam, seasonOrAllParam],
            responses: {
                "200": jsonResponse("Details for the player in the chosen season.", PlayerDetailRouteResponseSchema, PLAYER_DETAIL_EXAMPLE),
                "400": errorResponse("The id or season failed validation. `issues` says which.", {
                    error: "Invalid request",
                    code: "VALIDATION_ERROR",
                    issues: [{field: "season", input: "latest", message: "Invalid input"}],
                }),
                "401": UNAUTHORIZED_RESPONSE,
                "404": playerNotFound,
                "500": serverError,
            },
        }),
    },
    "/api/stats/summary": {
        get: operation({
            operationId: "getStatSummary",
            summary: "League-wide stat ranges",
            description: "Minimum, maximum and mean of every stat across all players in the chosen season. Use it to scale bars or tiers in game. Per-set and percentage ranges can be `null` when no player has a value.",
            parameters: [seasonOrAllParam],
            responses: {
                "200": jsonResponse("Ranges for the chosen season.", RawStatSummaryResponseSchema, STAT_SUMMARY_EXAMPLE),
                "400": invalidRequest,
                "401": UNAUTHORIZED_RESPONSE,
                "404": noCurrentSeason,
                "500": serverError,
            },
        }),
    },
    "/api/archives/get": {
        get: operation({
            operationId: "getChampionArchives",
            summary: "Champion rosters per region",
            description: "The champion team's roster for each region in one season, keyed by region code (`AS`, `EU`, `NA`, `SA`). Values are Roblox user ids. Regions with no recorded champion are left out, so an empty object is a valid answer.",
            parameters: [seasonParam],
            responses: {
                "200": jsonResponse("Champion rosters keyed by region code.", ChampionArchiveResponseSchema, CHAMPION_ARCHIVE_EXAMPLE),
                "400": errorResponse("The season failed validation. `all` is not accepted here.", {
                    error: "Invalid season",
                    code: "VALIDATION_ERROR",
                }),
                "401": UNAUTHORIZED_RESPONSE,
                "404": noCurrentSeason,
                "500": serverError,
            },
        }),
    },
    "/api/boosters": {
        get: operation({
            operationId: "getBoosters",
            summary: "Current Discord server boosters",
            description: "Roblox ids of everyone currently boosting the CVR Discord server whose Discord account is linked to Roblox. Covers players outside the league. The list is synced hourly.",
            responses: {
                "200": jsonResponse("Booster Roblox ids.", BoosterListResponseSchema, BOOSTERS_EXAMPLE),
                "401": UNAUTHORIZED_RESPONSE,
                "500": errorResponse("The booster list could not be read. Safe to retry later.", {
                    error: "Failed to read booster list",
                    code: "DB_ERROR",
                }),
            },
        }),
    },
};
