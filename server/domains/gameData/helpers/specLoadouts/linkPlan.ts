import type { Result } from '@/shared/types/result'
import { gameHeightToInches } from '@/shared/utils/height'
import type { SpecLoadout } from '../../types/datasets'
import { isLeagueLinkSpec, type HeightChange, type LeagueLinkSpec, type LinkSpec, type SpecCandidate, type SpecLinkDecision, type SpecLinkItem, type SpecLinkOp, type SpecLinkPlan, type SpecOpsPlan } from '../../types/specLinks'
import { nameDistance, normalizeSpecName } from './nameDistance'

export type { LinkSpec } from '../../types/specLinks'
export { normalizeSpecName } from './nameDistance'

const CANDIDATE_LIMIT = 5

const toCandidate = (spec: LeagueLinkSpec): SpecCandidate => ({ specId: spec.id, name: spec.name, stars: spec.stars, position: spec.position, height: spec.height })

export function buildSpecLinkPlan(loadouts: SpecLoadout[], specs: LinkSpec[], skipped: ReadonlySet<string> = new Set()): SpecLinkPlan {
    const keys = new Set(loadouts.map(l => l.key))
    const byGameKey = new Map(specs.filter(s => s.game_key !== null).map(s => [s.game_key as string, s]))
    const nameCounts = new Map<string, number>()
    for (const l of loadouts) {
        if (skipped.has(l.key) && !byGameKey.has(l.key)) continue
        const norm = normalizeSpecName(l.name)
        nameCounts.set(norm, (nameCounts.get(norm) ?? 0) + 1)
    }
    const linkable = specs.filter(isLeagueLinkSpec).filter(s => s.game_key === null || !keys.has(s.game_key))

    const items = loadouts.map((l): SpecLinkItem => {
        const base = { gameKey: l.key, gameName: l.name, height: gameHeightToInches(l.height), candidates: [] }
        const linked = byGameKey.get(l.key)
        if (linked) return { ...base, status: 'linked', specId: linked.id }

        const candidates = linkable
            .map(s => ({ spec: s, distance: nameDistance(l.name, s.name) }))
            .sort((a, b) => a.distance - b.distance || a.spec.name.localeCompare(b.spec.name))
            .slice(0, CANDIDATE_LIMIT)
            .map(c => toCandidate(c.spec))
        if (skipped.has(l.key)) return { ...base, status: 'skipped', candidates }

        const norm = normalizeSpecName(l.name)
        const matches = specs.filter(s => isLeagueLinkSpec(s) && s.game_key === null && normalizeSpecName(s.name) === norm)
        if (matches.length === 1 && nameCounts.get(norm) === 1) return { ...base, status: 'exact', specId: matches[0].id }
        return { ...base, status: 'ambiguous', candidates }
    })

    const orphaned = specs
        .filter(s => s.game_key !== null && !keys.has(s.game_key))
        .map(s => ({ specId: s.id, name: s.name, gameKey: s.game_key as string }))

    return { items, orphaned, specs }
}

export function planSpecOps(plan: SpecLinkPlan, decisions: SpecLinkDecision[], specs: LinkSpec[]): Result<SpecOpsPlan, string[]> {
    const errors: string[] = []
    const itemKeys = new Set(plan.items.map(i => i.gameKey))
    const decisionByKey = new Map<string, SpecLinkDecision>()
    for (const decision of decisions) {
        if (!itemKeys.has(decision.gameKey)) errors.push(`${decision.gameKey}: not in this import`)
        else decisionByKey.set(decision.gameKey, decision)
    }

    const specById = new Map(specs.map(s => [s.id, s]))
    const keptLinks = new Map(plan.items.filter(i => i.status === 'linked').map(i => [i.specId as string, i.gameKey]))
    const chosen = new Map<string, string>()
    const plannedNames = new Map<string, string>()
    const ops: SpecLinkOp[] = []
    const heightChanges: HeightChange[] = []
    const undecided: string[] = []

    const nameTaken = (name: string, ownId: string | null): boolean => {
        const norm = normalizeSpecName(name)
        if (plannedNames.has(norm) && plannedNames.get(norm) !== ownId) return true
        return specs.some(s => s.id !== ownId && normalizeSpecName(s.name) === norm)
    }

    for (const item of plan.items) {
        if (item.status === 'linked') {
            if (decisionByKey.get(item.gameKey)?.action === 'skip') {
                ops.push({ op: 'skip', gameKey: item.gameKey }, { op: 'unlink', gameKey: item.gameKey, specId: item.specId as string })
                continue
            }
            const spec = specById.get(item.specId as string)
            if (spec && spec.height !== item.height) {
                ops.push({ op: 'link', gameKey: item.gameKey, specId: spec.id, name: null, height: item.height })
                heightChanges.push({ specId: spec.id, name: spec.name, from: spec.height, to: item.height })
            }
            continue
        }

        const decision = decisionByKey.get(item.gameKey)
        if (item.status === 'skipped') {
            if (!decision || decision.action === 'skip') continue
            ops.push({ op: 'unskip', gameKey: item.gameKey })
        } else if (!decision) {
            undecided.push(item.gameKey)
            continue
        } else if (decision.action === 'skip') {
            ops.push({ op: 'skip', gameKey: item.gameKey })
            continue
        }
        if (decision.action === 'leave') continue

        if (decision.action === 'create' || decision.action === 'custom') {
            if (nameTaken(item.gameName, null)) {
                errors.push(`${item.gameKey}: Name "${item.gameName}" is already used by another spec`)
                continue
            }
            plannedNames.set(normalizeSpecName(item.gameName), `new:${item.gameKey}`)
            ops.push(decision.action === 'create'
                ? { op: 'create', gameKey: item.gameKey, name: item.gameName, stars: decision.stars, position: decision.position, height: item.height }
                : { op: 'custom', gameKey: item.gameKey, name: item.gameName, height: item.height })
            continue
        }

        const spec = specById.get(decision.specId)
        if (!spec) {
            errors.push(`${item.gameKey}: the chosen spec no longer exists`)
            continue
        }
        const kept = keptLinks.get(spec.id)
        if (kept !== undefined) {
            errors.push(`${item.gameKey}: ${spec.name} is already linked to "${kept}"`)
            continue
        }
        const claimedBy = chosen.get(spec.id)
        if (claimedBy !== undefined) {
            errors.push(`${item.gameKey}: ${spec.name} is already chosen for "${claimedBy}"`)
            continue
        }
        chosen.set(spec.id, item.gameKey)
        const name = decision.rename ? item.gameName : null
        if (name !== null) {
            if (nameTaken(name, spec.id)) {
                errors.push(`${item.gameKey}: Name "${name}" is already used by another spec`)
                continue
            }
            plannedNames.set(normalizeSpecName(name), spec.id)
        }
        ops.push({ op: 'link', gameKey: item.gameKey, specId: spec.id, name, height: item.height })
        if (spec.height !== item.height) heightChanges.push({ specId: spec.id, name: spec.name, from: spec.height, to: item.height })
    }

    if (errors.length > 0) return { ok: false, error: errors }
    return { ok: true, value: { ops, heightChanges, undecided } }
}
