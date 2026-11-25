import {z} from "zod"

export const PlayerRoleSchema = z.enum(["captain", "vice_captain", "court_captain", "player"])
export type PlayerRole = z.infer<typeof PlayerRoleSchema>

export const SavePlayerToTeamSchema = z.object({
    robloxUserId: z.string().min(1),
    username: z.string().min(1),
    displayName: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    teamId: z.uuid(),
})
export type SavePlayerToTeamInput = z.infer<typeof SavePlayerToTeamSchema>

export const RemovePlayerFromTeamSchema = z.object({
    playerId: z.uuid(),
    seasonId: z.uuid(),
})
export type RemovePlayerFromTeamInput = z.infer<typeof RemovePlayerFromTeamSchema>

export const TeamPlayersSchema = z.object({
    teamId: z.uuid(),
    seasonId: z.uuid(),
})
export type TeamPlayersInput = z.infer<typeof TeamPlayersSchema>

export const PlayersByIdsSchema = z.object({
    playerIds: z.array(z.uuid()),
})
export type PlayersByIdsInput = z.infer<typeof PlayersByIdsSchema>

export const SearchPlayersSchema = z.object({
    query: z.string().min(1),
    seasonId: z.uuid().optional(),
})
export type SearchPlayersInput = z.infer<typeof SearchPlayersSchema>

export const AddExistingPlayerToTeamSchema = z.object({
    playerId: z.uuid(),
    teamId: z.uuid(),
})
export type AddExistingPlayerToTeamInput = z.infer<typeof AddExistingPlayerToTeamSchema>

export const SetPlayerRoleSchema = z.object({
    playerId: z.uuid(),
    teamId: z.uuid(),
    seasonId: z.uuid(),
    role: PlayerRoleSchema,
})
export type SetPlayerRoleInput = z.infer<typeof SetPlayerRoleSchema>

export const TransferCaptainSchema = z.object({
    currentCaptainPlayerId: z.uuid(),
    newCaptainPlayerId: z.uuid(),
    teamId: z.uuid(),
    seasonId: z.uuid(),
})
export type TransferCaptainInput = z.infer<typeof TransferCaptainSchema>

export const PlayerLeaderboardSchema = z.object({
    regionCode: z.string().min(1).max(16).optional(),
    seasonId: z.uuid().optional(),
    teamId: z.uuid().optional(),
})
export type PlayerLeaderboardInput = z.infer<typeof PlayerLeaderboardSchema>

export const RangedLeaderboardSchema = z.object({
    seasonId: z.uuid(),
    regionId: z.uuid(),
    from: z.string().min(1),
    to: z.string().min(1),
})
export type RangedLeaderboardInput = z.infer<typeof RangedLeaderboardSchema>

export const RobloxIdParamSchema = z.object({
    robloxId: z.string().regex(/^\d+$/, "Invalid Roblox user id"),
})
export type RobloxIdParamInput = z.infer<typeof RobloxIdParamSchema>

export const SeasonQuerySchema = z.union([
    z.literal("all"),
    z.literal("current"),
    z.coerce.number().int().min(1),
])
export type SeasonQueryInput = z.infer<typeof SeasonQuerySchema>

const perSet = z.number().nullable()
const rank = z.number().min(0).max(1).nullable()

export const PlayerStatsResponseSchema = z.object({
    roblox_user_id: z.string(),
    sets_played: z.number(),
    points_per_set: perSet,
    scoring_rank: rank,
    spiking_rank: rank,
    setting_rank: rank,
    receiving_rank: rank,
    blocking_rank: rank,
    serving_rank: rank,
    spiking: z.object({
        ape_kills: z.number(),
        ape_attempts: z.number(),
        delay_kills: z.number(),
        quick_kills: z.number(),
        wipes_tools: z.number(),
        kill_attempts: z.number(),
        spiking_errors: z.number(),
        kills_per_set: perSet,
    }),
    setting: z.object({
        assists: z.number(),
        setting_errors: z.number(),
        assists_per_set: perSet,
    }),
    blocking: z.object({
        kill_blocks: z.number(),
        block_touches: z.number(),
        blocks_per_set: perSet,
    }),
    receiving: z.object({
        receives: z.number(),
        digs: z.number(),
        block_follows: z.number(),
        dives: z.number(),
        receive_errors: z.number(),
        receives_per_set: perSet,
        digs_per_set: perSet,
    }),
    serving: z.object({
        jump_serve_aces: z.number(),
        float_aces: z.number(),
        service_errors: z.number(),
        aces_per_set: perSet,
        net_serve_per_set: perSet,
    }),
})
export type PlayerStatsResponse = z.infer<typeof PlayerStatsResponseSchema>

export const PlayerAchievementSchema = z.object({
    season_id: z.string(),
    season_name: z.string(),
    season_slug: z.string(),
    place: z.number().int(),
    place_end: z.number().int(),
    team_id: z.string(),
    team_name: z.string(),
    team_slug: z.string(),
    is_captain: z.boolean(),
})
export type PlayerAchievement = z.infer<typeof PlayerAchievementSchema>

export const PlayerDetailAwardSchema = z.object({
    award_name: z.string(),
    category: z.string(),
    season_id: z.string(),
    season_name: z.string(),
})
export type PlayerDetailAward = z.infer<typeof PlayerDetailAwardSchema>

export const PlayerDetailSpecAwardSchema = z.object({
    name: z.string(),
    position: z.string(),
    stars: z.number().int(),
    season_id: z.string(),
    season_name: z.string(),
})
export type PlayerDetailSpecAward = z.infer<typeof PlayerDetailSpecAwardSchema>

export const PlayerDetailApiResponseSchema = z.object({
    achievements: z.array(PlayerAchievementSchema),
    awards: z.array(PlayerDetailAwardSchema),
    spec_awards: z.array(PlayerDetailSpecAwardSchema),
})
export type PlayerDetailApiResponse = z.infer<typeof PlayerDetailApiResponseSchema>

const StatSummaryTripletSchema = z.object({
    min: z.number(),
    max: z.number(),
    mean: z.number(),
})

const QualifiedStatSummaryTripletSchema = z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
    mean: z.number().nullable(),
})

export const RawStatSummaryResponseSchema = z.object({
    sets_played: StatSummaryTripletSchema,
    points_per_set: QualifiedStatSummaryTripletSchema,
    spiking: z.object({
        ape_kills: StatSummaryTripletSchema,
        ape_attempts: StatSummaryTripletSchema,
        delay_kills: StatSummaryTripletSchema,
        quick_kills: StatSummaryTripletSchema,
        wipes_tools: StatSummaryTripletSchema,
        kill_attempts: StatSummaryTripletSchema,
        spiking_errors: StatSummaryTripletSchema,
        kills_per_set: QualifiedStatSummaryTripletSchema,
        hit_pct: QualifiedStatSummaryTripletSchema,
    }),
    setting: z.object({
        assists: StatSummaryTripletSchema,
        setting_errors: StatSummaryTripletSchema,
        assists_per_set: QualifiedStatSummaryTripletSchema,
        set_pct: QualifiedStatSummaryTripletSchema,
    }),
    blocking: z.object({
        kill_blocks: StatSummaryTripletSchema,
        block_touches: StatSummaryTripletSchema,
        blocks_per_set: QualifiedStatSummaryTripletSchema,
        kb_pct: QualifiedStatSummaryTripletSchema,
    }),
    receiving: z.object({
        receives: StatSummaryTripletSchema,
        digs: StatSummaryTripletSchema,
        block_follows: StatSummaryTripletSchema,
        dives: StatSummaryTripletSchema,
        receive_errors: StatSummaryTripletSchema,
        receives_per_set: QualifiedStatSummaryTripletSchema,
        rec_pct: QualifiedStatSummaryTripletSchema,
    }),
    serving: z.object({
        jump_serve_aces: StatSummaryTripletSchema,
        float_aces: StatSummaryTripletSchema,
        service_errors: StatSummaryTripletSchema,
        aces_per_set: QualifiedStatSummaryTripletSchema,
    }),
})
export type RawStatSummaryResponse = z.infer<typeof RawStatSummaryResponseSchema>
