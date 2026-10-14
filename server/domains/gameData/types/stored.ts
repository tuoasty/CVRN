import type { Json } from '@/database.types'
import type { GameDatasetKind } from './datasets'

export interface UpsertGameDatasetDto {
    kind: GameDatasetKind
    payload: Json
    source_text: string
    imported_by: string
    imported_at: string
}
