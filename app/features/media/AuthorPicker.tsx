"use client"

import React, { useState, useEffect, useCallback } from "react"
import { RobloxUserWithAvatar } from "@/shared/types/roblox"
import { PlayerWithTeamInfo } from "@/server/domains/player"
import {
    searchPlayersAction,
    searchPlayersInDatabaseAction,
    getPlayerByExactUsernameAction,
    savePlayerAction,
} from "@/app/actions/player.actions"
import AvatarImage from "@/app/components/ui/AvatarImage"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Badge } from "@/app/components/ui/badge"
import { toast } from "@/app/utils/toast"
import { clientLogger } from "@/app/utils/clientLogger"

export type AuthorSelection = { id: string; label: string; avatarUrl?: string | null }

interface AuthorPickerProps {
    value: AuthorSelection | null
    onChange: (value: AuthorSelection | null) => void
}

export default function AuthorPicker({ value, onChange }: AuthorPickerProps) {
    const [query, setQuery] = useState("")
    const [dbSuggestions, setDbSuggestions] = useState<PlayerWithTeamInfo[]>([])
    const [robloxResults, setRobloxResults] = useState<RobloxUserWithAvatar[]>([])
    const [searching, setSearching] = useState(false)
    const [saving, setSaving] = useState<string | null>(null)

    const searchDatabase = useCallback(async (q: string) => {
        if (!q.trim()) { setDbSuggestions([]); return }
        try {
            const res = await searchPlayersInDatabaseAction({ query: q })
            setDbSuggestions(res.ok ? res.value : [])
        } catch (err) {
            clientLogger.error("AuthorPicker", "DB search failed", { query: q, err })
            setDbSuggestions([])
        }
    }, [])

    useEffect(() => {
        if (value) return
        const timer = setTimeout(() => searchDatabase(query), 300)
        return () => clearTimeout(timer)
    }, [query, value, searchDatabase])

    const reset = () => {
        setQuery("")
        setDbSuggestions([])
        setRobloxResults([])
    }

    const handleSearch = async () => {
        if (!query.trim()) return
        setSearching(true)
        setRobloxResults([])
        try {
            const exact = await getPlayerByExactUsernameAction({ query })
            if (exact.ok && exact.value) {
                setDbSuggestions([exact.value])
                setRobloxResults([])
                return
            }
            const res = await searchPlayersAction(query.trim())
            if (res.ok) {
                setRobloxResults(res.value)
                if (res.value.length === 0 && dbSuggestions.length === 0) toast.error("No users found")
            } else {
                setRobloxResults([])
                toast.error("Search failed")
            }
        } catch (err) {
            clientLogger.error("AuthorPicker", "Search failed", { err })
            toast.error("Search failed")
        } finally {
            setSearching(false)
        }
    }

    const selectDb = (p: PlayerWithTeamInfo) => {
        onChange({ id: p.id, label: p.display_name || p.username || "Unknown", avatarUrl: p.avatar_url })
        reset()
    }

    const selectRoblox = async (u: RobloxUserWithAvatar) => {
        setSaving(u.id.toString())
        const res = await savePlayerAction({
            robloxUserId: u.id.toString(),
            username: u.name,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
        })
        setSaving(null)
        if (!res.ok) { toast.error("Failed to save author"); return }
        onChange({ id: res.value.id, label: u.displayName || u.name, avatarUrl: u.avatarUrl })
        reset()
    }

    if (value) {
        return (
            <div className="space-y-1">
                <Label>Author <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <div className="panel p-2 flex items-center justify-between rounded-sm">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="relative w-8 h-8 rounded-sm overflow-hidden border border-border shrink-0">
                            <AvatarImage src={value.avatarUrl ?? ""} alt={value.label} sizes="32px" />
                        </div>
                        <span className="font-medium truncate">{value.label}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="rounded-sm" onClick={() => onChange(null)}>
                        Clear
                    </Button>
                </div>
            </div>
        )
    }

    const hasResults = robloxResults.length > 0 || dbSuggestions.length > 0

    return (
        <div className="space-y-1">
            <Label>Author <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <div className="flex gap-2">
                <Input
                    placeholder="Search Roblox username"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSearch() } }}
                    className="flex-1 rounded-sm"
                    autoComplete="off"
                />
                <Button type="button" onClick={handleSearch} disabled={searching || !query.trim()} className="rounded-sm">
                    {searching ? "..." : "Search"}
                </Button>
            </div>

            {hasResults && (
                <div className="space-y-2 max-h-64 overflow-y-auto pt-1">
                    {robloxResults.map(u => (
                        <div
                            key={`rbx-${u.id}`}
                            className="panel p-2 flex items-center justify-between bg-primary/5 rounded-sm"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="relative w-8 h-8 rounded-sm overflow-hidden border border-border shrink-0">
                                    <AvatarImage src={u.avatarUrl} alt={u.name} sizes="32px" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium truncate">{u.displayName || u.name}</span>
                                        {u.hasVerifiedBadge && (
                                            <Badge variant="secondary" className="rounded-sm text-primary">✓</Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">@{u.name}</div>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => selectRoblox(u)}
                                disabled={saving === u.id.toString()}
                                className="rounded-sm shrink-0"
                            >
                                {saving === u.id.toString() ? "..." : "Select"}
                            </Button>
                        </div>
                    ))}

                    {dbSuggestions.map(p => (
                        <div
                            key={`db-${p.id}`}
                            className="panel p-2 flex items-center justify-between bg-secondary/5 rounded-sm"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="relative w-8 h-8 rounded-sm overflow-hidden border border-border shrink-0">
                                    <AvatarImage src={p.avatar_url ?? ""} alt={p.username ?? ""} sizes="32px" />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-medium truncate">{p.display_name || p.username}</div>
                                    <div className="text-xs text-muted-foreground truncate">@{p.username}</div>
                                </div>
                            </div>
                            <Button type="button" size="sm" onClick={() => selectDb(p)} className="rounded-sm shrink-0">
                                Select
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
