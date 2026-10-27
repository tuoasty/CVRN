import type { PositionCode } from '@/shared/volleyball/positions'

export interface LinkSpec {
    id: string
    name: string
    stars: number | null
    position: string | null
    height: number
    game_key: string | null
    is_custom: boolean
}

export type LeagueLinkSpec = LinkSpec & { stars: number; position: string }

export const isLeagueLinkSpec = (spec: LinkSpec): spec is LeagueLinkSpec => !spec.is_custom && spec.stars !== null && spec.position !== null

export interface SpecCandidate {
    specId: string
    name: string
    stars: number
    position: string
    height: number
}

export type SpecLinkStatus = 'linked' | 'exact' | 'ambiguous' | 'skipped'

export interface SpecLinkItem {
    gameKey: string
    gameName: string
    height: number
    status: SpecLinkStatus
    specId?: string
    candidates: SpecCandidate[]
}

export interface OrphanedSpecLink {
    specId: string
    name: string
    gameKey: string
}

export interface SpecLinkPlan {
    items: SpecLinkItem[]
    orphaned: OrphanedSpecLink[]
    specs: LinkSpec[]
}

export const SPEC_STARS = [3, 4, 5] as const
export type SpecStars = (typeof SPEC_STARS)[number]

export type SpecLinkDecision =
    | { gameKey: string; action: 'link'; specId: string; rename: boolean }
    | { gameKey: string; action: 'create'; stars: SpecStars; position: PositionCode }
    | { gameKey: string; action: 'custom' }
    | { gameKey: string; action: 'leave' }
    | { gameKey: string; action: 'skip' }

export type SpecLinkOp =
    | { op: 'link'; gameKey: string; specId: string; name: string | null; height: number }
    | { op: 'create'; gameKey: string; name: string; stars: number; position: PositionCode; height: number }
    | { op: 'custom'; gameKey: string; name: string; height: number }
    | { op: 'skip'; gameKey: string }
    | { op: 'unlink'; gameKey: string; specId: string }
    | { op: 'unskip'; gameKey: string }

export interface HeightChange {
    specId: string
    name: string
    from: number
    to: number
}

export interface SpecOpsPlan {
    ops: SpecLinkOp[]
    heightChanges: HeightChange[]
    undecided: string[]
}
