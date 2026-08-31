"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Label } from "@/app/components/ui/label"
import { Button } from "@/app/components/ui/button"
import { cn } from "@/lib/utils"
import { MatchTypeTabs, WeekSelector, PlayoffStepper } from "@/app/features/matches/ScheduleSelectors"
import {
    useWeekSchedule,
    usePlayoffSchedule,
    useDefaultWeekForSeason,
    useWeekMatchCounts,
    useAvailablePlayoffRounds,
    usePlayoffRoundCounts,
} from "@/app/hooks/useMatches"
import { useSeasons } from "@/app/hooks/useSeasons"
import { useTeamsBySeason } from "@/app/hooks/useTeams"
import { isPlayoffRound, sortRounds, roundLabelShort } from "@/app/utils/playoffRounds"
import { PlayoffRound } from "@/server/domains/playoff"

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
    const { seasons } = useSeasons()
    const season = seasons.find(s => s.id === seasonId)
    const hasPlayoffs = !!season?.playoff_started

    const [matchType, setMatchType] = useState<"season" | "playoffs">("season")
    const [weekOverride, setWeekOverride] = useState<number | null>(null)
    const [roundOverride, setRoundOverride] = useState<PlayoffRound | null>(null)

    useEffect(() => {
        setWeekOverride(null)
        setRoundOverride(null)
        setMatchType(hasPlayoffs ? "playoffs" : "season")
    }, [seasonId, hasPlayoffs])

    const { defaultWeek } = useDefaultWeekForSeason(seasonId && !weekOverride ? seasonId : null)
    const { weekCounts } = useWeekMatchCounts(seasonId)
    const availableWeeks = useMemo(() => weekCounts.map(w => w.week).sort((a, b) => a - b), [weekCounts])
    const effectiveWeek = weekOverride ?? defaultWeek ?? 1

    const { rounds: availableRounds } = useAvailablePlayoffRounds(hasPlayoffs ? seasonId : null)
    const { roundCounts } = usePlayoffRoundCounts(hasPlayoffs ? seasonId : null)
    const sortedRounds = useMemo(() => sortRounds(availableRounds.filter(isPlayoffRound)), [availableRounds])
    const effectiveRound: PlayoffRound =
        roundOverride && sortedRounds.includes(roundOverride) ? roundOverride : sortedRounds[0] ?? "play_in"

    const roundCountMap = useMemo(() => {
        const m = new Map<string, number>()
        for (const { round, count } of roundCounts) m.set(round, count)
        return m
    }, [roundCounts])

    const { schedule: weekSchedule } = useWeekSchedule(
        matchType === "season" && seasonId ? seasonId : null,
        matchType === "season" ? effectiveWeek : null,
    )
    const { schedule: playoffSchedule } = usePlayoffSchedule(
        matchType === "playoffs" && seasonId ? seasonId : null,
        matchType === "playoffs" ? effectiveRound : null,
    )
    const schedule = matchType === "season" ? weekSchedule : playoffSchedule

    const { teams } = useTeamsBySeason(seasonId)
    const teamName = useMemo(() => {
        const map = new Map<string, string>()
        for (const t of teams) map.set(t.id, t.name)
        return map
    }, [teams])

    function nameFor(id: string | null): string {
        return id ? teamName.get(id) ?? "TBD" : "TBD"
    }

    function labelFor(homeId: string | null, awayId: string | null, code: string | null): string {
        return `${nameFor(homeId)} vs ${nameFor(awayId)}${code ? ` · ${code}` : ""}`
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
                    <MatchTypeTabs activeTab={matchType} playoffsEnabled={hasPlayoffs} onTabChange={setMatchType} />

                    {matchType === "season" ? (
                        availableWeeks.length > 0 && (
                            <WeekSelector effectiveWeek={effectiveWeek} weeks={availableWeeks} onWeekChange={setWeekOverride} />
                        )
                    ) : (
                        sortedRounds.length > 0 && (
                            <PlayoffStepper
                                rounds={sortedRounds}
                                effectiveRound={effectiveRound}
                                roundCountMap={roundCountMap}
                                onRoundChange={r => setRoundOverride(r as PlayoffRound)}
                            />
                        )
                    )}

                    <div className="space-y-1 max-h-64 overflow-y-auto">
                        {schedule.length === 0 ? (
                            <p className="text-xs text-muted-foreground px-1 py-3 text-center">No matches here.</p>
                        ) : (
                            schedule.map(({ match, playoff_round }) => {
                                const label = labelFor(match.home_team_id, match.away_team_id, match.match_code)
                                const selected = value?.id === match.id
                                return (
                                    <button
                                        key={match.id}
                                        type="button"
                                        onClick={() => onChange({ id: match.id, label })}
                                        className={cn(
                                            "w-full text-left panel p-2 rounded-sm transition-colors flex items-center justify-between gap-2",
                                            selected ? "bg-primary/15 border-primary/30" : "hover:bg-muted/40",
                                        )}
                                    >
                                        <span className="text-sm truncate">
                                            {nameFor(match.home_team_id)} <span className="text-muted-foreground">vs</span> {nameFor(match.away_team_id)}
                                        </span>
                                        <span className="text-[10px] font-mono uppercase text-muted-foreground shrink-0">
                                            {matchType === "playoffs" && playoff_round ? roundLabelShort(playoff_round) : match.match_code ?? ""}
                                        </span>
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
