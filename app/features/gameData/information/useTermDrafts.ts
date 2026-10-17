"use client"

import { useCallback, useMemo, useState } from 'react'
import { humanize } from '@/server/domains/gameData/terms/format'
import { termMap } from '@/server/domains/gameData/terms/template'
import { normalizeTermDraft, previewTermChanges, termChanged, validateTermDraft, type TermChange } from '@/server/domains/gameData/terms/termEdit'
import { termId } from '@/server/domains/gameData/terms/termUsage'
import type { GameTerm, TermKind } from '@/server/domains/gameData/terms/types'
import { useInformation } from './InformationProvider'

export interface TermDrafts {
    termFor: (kind: TermKind, tag: string) => GameTerm
    edit: (kind: TermKind, tag: string, patch: Partial<Pick<GameTerm, 'label' | 'unit' | 'template' | 'grants'>>) => void
    dirty: GameTerm[]
    changes: TermChange[]
    errors: { term: GameTerm; messages: string[] }[]
    saving: boolean
    saveAll: () => Promise<boolean>
    reset: () => void
}

export function blankTerm(kind: TermKind, tag: string): GameTerm {
    return { kind, tag, category: 'special', label: kind === 'effect' ? humanize(tag).toLowerCase() : null, unit: null, template: null, grants: null, verified: false }
}

export function useTermDrafts(): TermDrafts {
    const { terms, abilities, context, saveTerm } = useInformation()
    const [drafts, setDrafts] = useState<Record<string, GameTerm>>({})
    const [saving, setSaving] = useState(false)

    const stored = useCallback((kind: TermKind, tag: string) => termMap(terms, kind).get(tag), [terms])

    const termFor = useCallback((kind: TermKind, tag: string) => drafts[termId(kind, tag)] ?? stored(kind, tag) ?? blankTerm(kind, tag), [drafts, stored])

    const edit = useCallback<TermDrafts['edit']>((kind, tag, patch) => {
        setDrafts(d => {
            const id = termId(kind, tag)
            const current = d[id] ?? stored(kind, tag) ?? blankTerm(kind, tag)
            return { ...d, [id]: { ...current, ...patch } }
        })
    }, [stored])

    const dirty = useMemo(() => Object.values(drafts)
        .map(normalizeTermDraft)
        .filter(d => termChanged(stored(d.kind, d.tag), d)), [drafts, stored])

    const changes = useMemo(() => previewTermChanges(abilities, context, dirty), [abilities, context, dirty])
    const keys = useMemo(() => new Set(abilities.map(a => a.key)), [abilities])
    const errors = useMemo(() => dirty
        .map(term => ({ term, messages: validateTermDraft(term, keys) }))
        .filter(e => e.messages.length > 0), [dirty, keys])

    const reset = useCallback(() => setDrafts({}), [])

    const saveAll = useCallback(async () => {
        if (dirty.length === 0 || errors.length > 0 || saving) return false
        setSaving(true)
        const saved: string[] = []
        for (const term of dirty) {
            const ok = await saveTerm({
                kind: term.kind,
                tag: term.tag,
                category: term.category,
                label: term.label,
                unit: term.unit,
                template: term.template,
                grants: term.grants,
            })
            if (ok) saved.push(termId(term.kind, term.tag))
        }
        setDrafts(d => Object.fromEntries(Object.entries(d).filter(([id]) => !saved.includes(id))))
        setSaving(false)
        return saved.length === dirty.length
    }, [dirty, errors, saving, saveTerm])

    return { termFor, edit, dirty, changes, errors, saving, saveAll, reset }
}
