import type { LuaParseError } from './luaValue'
import type { DatasetDiff, DatasetIssue, GameDatasetKind, GameDatasetPayloads, StoredDatasetSummary } from './datasets'

export type PreviewDataset = {
    [K in GameDatasetKind]: {
        kind: K
        root: string
        line: number
        count: number
        payload: GameDatasetPayloads[K]
        issues: DatasetIssue[]
        diff: DatasetDiff | null
    }
}[GameDatasetKind]

export interface IgnoredStatement {
    target: string
    line: number
}

export type GameDataPreview =
    | { status: 'parse_error'; error: LuaParseError }
    | {
        status: 'ok'
        datasets: PreviewDataset[]
        ignored: IgnoredStatement[]
        crossIssues: DatasetIssue[]
        checkedKinds: GameDatasetKind[]
        canPublish: boolean
        hasChanges: boolean
    }

export interface StoredGameDatasets {
    payloads: Partial<GameDatasetPayloads>
    summaries: StoredDatasetSummary[]
}

export interface PublishGameDataResult {
    published: GameDatasetKind[]
    stored: StoredGameDatasets
}
