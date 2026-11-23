import type { SpecLinkDecision, SpecLinkPlan } from '../../types/specLinks'

export interface SpecWriteSummary {
    links: number
    proposed: number
    picked: number
    created: number
    custom: number
    unlinked: number
    skipped: number
    left: number
    renamed: number
}

export type PublishBlocker = 'stale' | 'pending' | 'errors' | 'undecided' | 'nothing'

export function seedProposalDecisions(plan: SpecLinkPlan): Record<string, SpecLinkDecision> {
    const decisions: Record<string, SpecLinkDecision> = {}
    for (const item of plan.items) {
        if (item.status !== 'exact' || item.specId === undefined) continue
        decisions[item.gameKey] = { gameKey: item.gameKey, action: 'link', specId: item.specId, rename: false }
    }
    return decisions
}

export function summarizeSpecWrites(plan: SpecLinkPlan, decisions: Record<string, SpecLinkDecision>): SpecWriteSummary {
    const summary: SpecWriteSummary = { links: 0, proposed: 0, picked: 0, created: 0, custom: 0, unlinked: 0, skipped: 0, left: 0, renamed: 0 }
    for (const item of plan.items) {
        const decision = decisions[item.gameKey]
        if (item.status === 'linked') {
            if (decision?.action === 'skip') summary.unlinked++
            continue
        }
        if (!decision) continue
        if (decision.action === 'link') {
            if (item.status === 'exact' && decision.specId === item.specId) summary.proposed++
            else summary.picked++
            if (decision.rename) summary.renamed++
        } else if (decision.action === 'create') summary.created++
        else if (decision.action === 'custom') summary.custom++
        else if (decision.action === 'leave') summary.left++
        else if (item.status !== 'skipped') summary.skipped++
    }
    summary.links = summary.proposed + summary.picked
    return summary
}

export function publishBlocker(s: { stale: boolean; canPublish: boolean; pending: number; planErrors: number; undecided: number; hasChanges: boolean; specOps: number }): PublishBlocker | null {
    if (s.stale) return 'stale'
    if (s.pending > 0) return 'pending'
    if (!s.canPublish || s.planErrors > 0) return 'errors'
    if (s.undecided > 0) return 'undecided'
    if (!s.hasChanges && s.specOps === 0) return 'nothing'
    return null
}

export function publishBlockerText(blocker: PublishBlocker, undecided: number): string {
    if (blocker === 'stale') return 'Preview again first.'
    if (blocker === 'pending') return 'Choose what each listed line is first.'
    if (blocker === 'errors') return 'Fix the errors above first.'
    if (blocker === 'undecided') return `${undecided} left`
    return 'Matches what is stored.'
}
