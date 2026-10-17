"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { saveGameTermAction, setAbilityDescriptionSourceAction, setGameTermVerifiedAction } from '@/app/actions/gameData.actions'
import { toast } from '@/app/utils/toast'
import { buildAbilityIndex } from '@/server/domains/gameData/helpers/abilityIndex/buildAbilityIndex'
import { createAbilityLookup, describeAbility, type DescribeContext } from '@/server/domains/gameData/terms/describeAbility'
import { createTermBook } from '@/server/domains/gameData/terms/template'
import { lineNeedsAttention, normalizeTermDraft } from '@/server/domains/gameData/terms/termEdit'
import { collectTermUsage, unhandledTerms, type TermUsage } from '@/server/domains/gameData/terms/termUsage'
import type { Ability, Rarity } from '@/server/domains/gameData/types/datasets'
import type { AbilityIndexEntry } from '@/server/domains/gameData/types/abilityIndex'
import type { StoredGameDatasets } from '@/server/domains/gameData/types/preview'
import type { DescriptionSource, SaveGameTermInput } from '@/server/domains/gameData/types/schemas'
import type { GameTerm, TermBook, TermKind } from '@/server/domains/gameData/terms/types'

export interface InformationState {
    stored: StoredGameDatasets
    abilities: Ability[]
    abilityByKey: Map<string, Ability>
    rarities: Rarity[]
    index: Map<string, AbilityIndexEntry>
    termList: GameTerm[]
    terms: TermBook
    context: DescribeContext
    usage: Map<string, TermUsage>
    unhandled: TermUsage[]
    attention: Set<string>
    settings: Record<string, DescriptionSource>
    userId: string
    loadError: string | null
    saveTerm: (input: SaveGameTermInput) => Promise<boolean>
    setVerified: (kind: TermKind, tag: string, verified: boolean) => Promise<boolean>
    setDescriptionSource: (abilityKey: string, source: DescriptionSource) => Promise<boolean>
    replaceStored: (next: StoredGameDatasets) => void
}

const InformationContext = createContext<InformationState | null>(null)

export function useInformation(): InformationState {
    const state = useContext(InformationContext)
    if (!state) throw new Error('useInformation must be used inside InformationProvider')
    return state
}

const sameTerm = (kind: TermKind, tag: string) => (t: GameTerm) => t.kind === kind && t.tag === tag

function putTerm(list: GameTerm[], term: GameTerm): GameTerm[] {
    const at = list.findIndex(sameTerm(term.kind, term.tag))
    if (at === -1) return [...list, term]
    const next = [...list]
    next[at] = term
    return next
}

function restoreTerm(list: GameTerm[], kind: TermKind, tag: string, previous: GameTerm | undefined): GameTerm[] {
    if (previous) return putTerm(list, previous)
    return list.filter(t => !sameTerm(kind, tag)(t))
}

interface InformationProviderProps {
    initialStored: StoredGameDatasets
    initialTerms: GameTerm[]
    initialSettings: Record<string, DescriptionSource>
    userId: string
    loadError: string | null
    children: ReactNode
}

export function InformationProvider({ initialStored, initialTerms, initialSettings, userId, loadError, children }: InformationProviderProps) {
    const [stored, setStored] = useState(initialStored)
    const [termList, setTermList] = useState(initialTerms)
    const [settings, setSettings] = useState(initialSettings)

    const data = useMemo(() => {
        const abilities = stored.payloads.abilities ?? []
        const rarities = stored.payloads.rarities ?? []
        const index = new Map(buildAbilityIndex({
            abilities,
            physicals: stored.payloads.physicals,
            technicals: stored.payloads.technicals,
            rarities,
        }).map(e => [e.key, e]))
        return { abilities, rarities, index, abilityByKey: new Map(abilities.map(a => [a.key, a])), usage: collectTermUsage(abilities) }
    }, [stored])

    const wording = useMemo(() => {
        const terms = createTermBook(termList)
        const context: DescribeContext = { terms, lookup: createAbilityLookup(data.abilities) }
        const attention = new Set(data.abilities.filter(a => lineNeedsAttention(describeAbility(a, context))).map(a => a.key))
        return { terms, context, attention, unhandled: unhandledTerms(data.usage, terms) }
    }, [termList, data])

    const saveTerm = useCallback(async (input: SaveGameTermInput) => {
        const previous = termList.find(sameTerm(input.kind, input.tag))
        const optimistic = normalizeTermDraft({ ...input, verified: previous?.verified ?? false, updatedBy: userId, updatedAt: new Date().toISOString() })
        setTermList(list => putTerm(list, optimistic))
        const result = await saveGameTermAction(input)
        if (!result.ok) {
            setTermList(list => restoreTerm(list, input.kind, input.tag, previous))
            toast.error('Wording not saved', result.error.message)
            return false
        }
        setTermList(list => putTerm(list, result.value))
        return true
    }, [termList, userId])

    const setVerified = useCallback(async (kind: TermKind, tag: string, verified: boolean) => {
        const previous = termList.find(sameTerm(kind, tag))
        if (!previous) return false
        setTermList(list => putTerm(list, { ...previous, verified }))
        const result = await setGameTermVerifiedAction({ kind, tag, verified })
        if (!result.ok) {
            setTermList(list => restoreTerm(list, kind, tag, previous))
            toast.error('Status not saved', result.error.message)
            return false
        }
        setTermList(list => putTerm(list, result.value))
        return true
    }, [termList])

    const setDescriptionSource = useCallback(async (abilityKey: string, source: DescriptionSource) => {
        const previous = settings[abilityKey]
        setSettings(s => ({ ...s, [abilityKey]: source }))
        const result = await setAbilityDescriptionSourceAction({ abilityKey, source })
        if (!result.ok) {
            setSettings(s => {
                const next = { ...s }
                if (previous) next[abilityKey] = previous
                else delete next[abilityKey]
                return next
            })
            toast.error('Description choice not saved', result.error.message)
            return false
        }
        return true
    }, [settings])

    const value = useMemo<InformationState>(() => ({
        stored,
        ...data,
        ...wording,
        termList,
        settings,
        userId,
        loadError,
        saveTerm,
        setVerified,
        setDescriptionSource,
        replaceStored: setStored,
    }), [stored, data, wording, termList, settings, userId, loadError, saveTerm, setVerified, setDescriptionSource])

    return <InformationContext.Provider value={value}>{children}</InformationContext.Provider>
}
