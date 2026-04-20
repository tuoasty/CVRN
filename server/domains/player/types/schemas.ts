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
