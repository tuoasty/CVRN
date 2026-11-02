'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'
import { Search } from 'lucide-react'
import AvatarImage from '@/app/components/ui/AvatarImage'
import { Input } from '@/app/components/ui/input'
import {
    getPlayerByExactUsernameAction,
    searchPlayersAction,
    searchPlayersInDatabaseAction,
} from '@/app/actions/player.actions'
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import { LINK } from './cardFormStyles'

export interface CustomPlayerChoice {
    playerId: string | null
    robloxUserId: string
    username: string
    displayName: string | null
    avatarUrl: string | null
}

interface PlayerRowLike {
    id: string
    roblox_user_id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
}

function fromPlayerRow(row: PlayerRowLike): CustomPlayerChoice | null {
    if (!row.username) return null
    return {
        playerId: row.id,
        robloxUserId: row.roblox_user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
    }
}

async function fetchDatabaseHits([, query]: readonly [string, string]): Promise<CustomPlayerChoice[]> {
    const result = await searchPlayersInDatabaseAction({ query })
    if (!result.ok) throw new Error(result.error.message)
    return result.value.flatMap(row => fromPlayerRow(row) ?? [])
}

interface RobloxLookup {
    query: string
    choices: CustomPlayerChoice[]
    error: string | null
}

export default function CustomPlayerPicker({ selected, onSelect }: {
    selected: CustomPlayerChoice | null
    onSelect: (player: CustomPlayerChoice) => void
}) {
    const [query, setQuery] = useState('')
    const [searching, setSearching] = useState(false)
    const [lookup, setLookup] = useState<RobloxLookup | null>(null)

    const trimmed = query.trim()
    const debounced = useDebouncedValue(trimmed, 300)
    const { data: dbHits, error: dbError } = useSWR(
        debounced ? (['cardCustomPlayerSearch', debounced] as const) : null,
        fetchDatabaseHits,
        { keepPreviousData: true, revalidateOnFocus: false },
    )

    const current = lookup?.query === trimmed ? lookup : null
    const hits = trimmed ? dbHits ?? [] : []
    const dbChoices = [...hits, ...(current?.choices.filter(c => c.playerId) ?? [])]
        .filter((c, i, all) => all.findIndex(o => o.robloxUserId === c.robloxUserId) === i)
    const robloxChoices = (current?.choices ?? [])
        .filter(c => !c.playerId && !dbChoices.some(o => o.robloxUserId === c.robloxUserId))
    const choices = [...dbChoices, ...robloxChoices]

    async function handleLookup(event: FormEvent) {
        event.preventDefault()
        if (!trimmed || searching) return
        setSearching(true)
        try {
            const exact = await getPlayerByExactUsernameAction({ query: trimmed })
            const exactChoice = exact.ok && exact.value ? fromPlayerRow(exact.value) : null
            if (exactChoice) {
                setLookup({ query: trimmed, choices: [exactChoice], error: null })
                return
            }
            const roblox = await searchPlayersAction(trimmed)
            setLookup(roblox.ok
                ? {
                    query: trimmed,
                    error: null,
                    choices: roblox.value.map(user => ({
                        playerId: null,
                        robloxUserId: String(user.id),
                        username: user.name,
                        displayName: user.displayName || null,
                        avatarUrl: user.avatarUrl || null,
                    })),
                }
                : { query: trimmed, choices: [], error: roblox.error.message })
        } finally {
            setSearching(false)
        }
    }

    const emptyMessage = !trimmed
        ? 'Search the league database first. Press Enter to look up a Roblox username.'
        : current && !current.error
            ? 'No player or Roblox user has this name.'
            : 'No league player matches. Press Enter to look up this Roblox username.'

    return (
        <div className="flex flex-col">
            <form onSubmit={handleLookup} className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search or enter a Roblox username"
                    aria-label="Search for a custom player"
                    autoComplete="off"
                    className="h-8 rounded-sm pl-8 text-sm"
                />
            </form>

            <div className="mt-1 flex h-5 items-center">
                <button type="button" className={LINK} disabled={!trimmed || searching} onClick={handleLookup}>
                    {searching ? 'Looking up...' : 'Look up on Roblox'}
                </button>
            </div>

            {dbError && <p className="py-2 text-xs text-destructive">League search failed. Try again.</p>}
            {current?.error && <p className="py-2 text-xs text-destructive">{current.error}</p>}

            {choices.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
                <ul className="mt-1 max-h-[34rem] overflow-y-auto border-y border-border" role="listbox" aria-label="Custom player results">
                    {choices.map(choice => {
                        const isSelected = selected?.robloxUserId === choice.robloxUserId
                        return (
                            <li key={choice.robloxUserId} role="option" aria-selected={isSelected}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(choice)}
                                    className={cn(
                                        'grid h-11 w-full grid-cols-[1.75rem_1fr_auto] items-center gap-2 px-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                        isSelected
                                            ? 'font-semibold text-foreground shadow-[inset_2px_0_0_currentColor]'
                                            : 'text-foreground hover:bg-muted/40',
                                    )}
                                >
                                    <span className="relative h-7 w-7 overflow-hidden">
                                        <AvatarImage src={choice.avatarUrl} alt="" sizes="28px" />
                                    </span>
                                    <span className="flex min-w-0 flex-col">
                                        <span className="truncate">{choice.username}</span>
                                        {choice.displayName && choice.displayName !== choice.username && (
                                            <span className="truncate text-xs font-normal text-muted-foreground">{choice.displayName}</span>
                                        )}
                                    </span>
                                    {!choice.playerId && <span className="text-xs font-normal text-muted-foreground">Not registered</span>}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
