import type { GameTermReadRow } from '@/server/db/gameTerm.repo'
import { TERM_CATEGORIES, TERM_KINDS, type GameTerm, type TermCategory, type TermKind } from '../terms/types'

const isKind = (kind: string): kind is TermKind => (TERM_KINDS as readonly string[]).includes(kind)
const isCategory = (category: string): category is TermCategory => (TERM_CATEGORIES as readonly string[]).includes(category)

export function toGameTerm(row: GameTermReadRow): GameTerm | null {
    if (!isKind(row.kind)) return null
    return {
        kind: row.kind,
        tag: row.tag,
        category: isCategory(row.category) ? row.category : 'special',
        label: row.label,
        unit: row.unit,
        template: row.template,
        grants: row.grants,
        verified: row.verified,
    }
}
