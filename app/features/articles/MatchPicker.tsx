"use client"

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { Label } from "@/app/components/ui/label"
import { Button } from "@/app/components/ui/button"
import { cn } from "@/lib/utils"
import { useAllMatches } from "@/app/hooks/useMatches"
import { useTeamsBySeason } from "@/app/hooks/useTeams"

export interface MatchSelection {
    id: string
    label: string
}

interface MatchPickerProps {
    seasonId: string | null
    value: MatchSelection | null
    onChange: (value: MatchSelection | null) => void
}

export default function MatchPicker({ seasonId, value, onChange }: MatchPickerProps) {
    const { matches } = useAllMatches()
    const { teams } = useTeamsBySeason(seasonId)
    const [query, setQuery] = useState("")

    const teamName = useMemo(() => {
        const map = new Map<string, string>()
        for (const t of teams) map.set(t.id, t.name)
        return map
    }, [teams])

    const options = useMemo(() => {
        if (!seasonId) return []
        return matches
            .filter(m => m.season_id === seasonId && m.home_team_id && m.away_team_id)
            .map(m => ({
                id: m.id,
                home: teamName.get(m.home_team_id as string) ?? null,
                away: teamName.get(m.away_team_id as string) ?? null,
                code: m.match_code,
                scheduledAt: m.scheduled_at,
            }))
            .filter(o => o.home && o.away)
            .sort((a, b) => (b.scheduledAt ?? "").localeCompare(a.scheduledAt ?? ""))
    }, [matches, seasonId, teamName])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return options
        return options.filter(o =>
            (o.home ?? "").toLowerCase().includes(q) ||
            (o.away ?? "").toLowerCase().includes(q) ||
            (o.code ?? "").toLowerCase().includes(q)
        )
    }, [options, query])

    function select(o: (typeof options)[number]) {
        onChange({ id: o.id, label: `${o.home} vs ${o.away}${o.code ? ` · ${o.code}` : ""}` })
    }

    return (
        <div className="space-y-2">
            <Label>Match <span className="text-muted-foreground text-xs">(optional)</span></Label>

            {value && (
                <div className="panel p-2 flex items-center justify-between rounded-sm bg-primary/5 border-primary/20">
                    <span className="font-medium truncate text-sm">{value.label}</span>
                    <Button type="button" variant="ghost" size="sm" className="rounded-sm shrink-0" onClick={() => onChange(null)}>
                        Clear
                    </Button>
                </div>
            )}

            {!seasonId ? (
                <p className="text-xs text-muted-foreground">Select a season to link a match.</p>
            ) : (
                <>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search by team or match code..."
                            className="w-full h-9 pl-8 pr-8 text-sm rounded-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="space-y-1 max-h-72 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <p className="text-xs text-muted-foreground px-1 py-3 text-center">
                                {options.length === 0 ? "No matches with both teams set yet." : "No matches found."}
                            </p>
                        ) : (
                            filtered.map(o => {
                                const selected = value?.id === o.id
                                return (
                                    <button
                                        key={o.id}
                                        type="button"
                                        onClick={() => select(o)}
                                        className={cn(
                                            "w-full text-left panel p-2 rounded-sm transition-colors flex items-center justify-between gap-3",
                                            selected ? "bg-primary/15 border-primary/30" : "hover:bg-muted/40",
                                        )}
                                    >
                                        <span className="text-sm truncate min-w-0">
                                            <span className="font-medium">{o.home}</span>
                                            <span className="text-muted-foreground"> vs </span>
                                            <span className="font-medium">{o.away}</span>
                                        </span>
                                        {o.code && (
                                            <span className="text-xs font-mono uppercase text-muted-foreground shrink-0">{o.code}</span>
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
