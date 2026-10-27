export const OVERALL_POSITIONS = ['OUT', 'OPP', 'MID', 'SET', 'LIB'] as const
export type OverallPosition = typeof OVERALL_POSITIONS[number]

export const OVERALL_CATEGORIES = ['scoring', 'spiking', 'setting', 'blocking', 'receiving', 'serving'] as const
export type OverallCategory = typeof OVERALL_CATEGORIES[number]

export type CategoryRanks = Record<OverallCategory, number | null>
export type CategoryWeights = Record<OverallCategory, number>
export type CategoryRatings = Record<OverallCategory, number>

export interface OverallScaling {
    position: OverallPosition
    weights: CategoryWeights
    floor: number
    ceil: number
    curve: number
}

export type OverallScalingSet = Record<OverallPosition, OverallScaling>

export interface OverallInputRow {
    playerId: string
    robloxUserId: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    teamId: string | null
    teamName: string | null
    teamLogoUrl: string | null
    position: OverallPosition | null
    setsPlayed: number
    ranks: CategoryRanks
}

export interface OverallConfig {
    scalings: OverallScalingSet
    savedPositions: OverallPosition[]
    overrides: Record<string, number>
}

export interface OverallBoard {
    players: OverallInputRow[]
    config: OverallConfig
}

export interface ComputedOverall {
    ovr: number
    attributes: CategoryRatings
}

export {
    SeasonIdSchema,
    SaveOverallScalingsSchema,
    CopyOverallScalingsSchema,
    SetOverallOverrideSchema,
    ClearOverallOverrideSchema,
} from './schemas'
export type {
    SeasonIdInput,
    SaveOverallScalingsInput,
    CopyOverallScalingsInput,
    SetOverallOverrideInput,
    ClearOverallOverrideInput,
} from './schemas'
