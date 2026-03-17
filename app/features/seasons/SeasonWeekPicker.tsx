"use client";

import React, { useEffect, useState } from "react";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useRegions } from "@/app/hooks/useRegions";
import { useAvailablePlayoffRounds } from "@/app/hooks/useMatches";
import { Label } from "@/app/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import { PlayoffRound } from "@/server/dto/playoff.dto";

interface SeasonWeekPickerProps {
    selectedSeasonId: string;
    selectedWeek?: number;
    selectedMatchType?: "season" | "playoff";
    selectedRound?: PlayoffRound;
    onSeasonChange: (seasonId: string) => void;
    onWeekChange?: (week: number) => void;
    onMatchTypeChange?: (type: "season" | "playoff") => void;
    onRoundChange?: (round: PlayoffRound) => void;
}

const ROUND_LABELS: Record<string, string> = {
    play_in: "Play-in",
    round_of_16: "Round of 16",
    quarterfinal: "Quarterfinals",
    semifinal: "Semifinals",
    third_place: "3rd Place",
    final: "Finals",
};

const ROUND_ORDER: Record<string, number> = {
    play_in: 1,
    round_of_16: 2,
    quarterfinal: 3,
    semifinal: 4,
    third_place: 5,
    final: 6,
};

export default function SeasonWeekPicker({
                                             selectedSeasonId,
                                             selectedWeek,
                                             selectedMatchType,
                                             selectedRound,
                                             onSeasonChange,
                                             onWeekChange,
                                             onMatchTypeChange,
                                             onRoundChange,
                                         }: SeasonWeekPickerProps) {
    const { seasons } = useSeasons();
    const { regions } = useRegions();
    const { rounds: fetchedRounds } = useAvailablePlayoffRounds(selectedSeasonId || null);

    const [maxWeeks, setMaxWeeks] = useState(10);

    const availableRounds = [...fetchedRounds].sort((a, b) => {
        return (ROUND_ORDER[a] || 999) - (ROUND_ORDER[b] || 999);
    });

    useEffect(() => {
        if (selectedSeasonId && seasons.length > 0) {
            const season = seasons.find(s => s.id === selectedSeasonId);
            if (season) {
                setMaxWeeks(season.weeks || 10);

                if (onMatchTypeChange && !selectedMatchType) {
                    onMatchTypeChange(season.playoff_started ? "playoff" : "season");
                }
            }
        }
    }, [selectedSeasonId, seasons]);

    useEffect(() => {
        if (availableRounds.length > 0 && onRoundChange && !selectedRound) {
            onRoundChange(availableRounds[0] as PlayoffRound);
        }
    }, [availableRounds]);

    const groupedSeasons = regions.map(region => ({
        region,
        seasons: seasons.filter(s => s.region_id === region.id),
    })).filter(g => g.seasons.length > 0);

    const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
    const showMatchTypePicker = selectedSeason?.playoff_started;

    return (
        <div className="space-y-4">
            <div>
                <Label>Season</Label>
                <Select value={selectedSeasonId} onValueChange={onSeasonChange}>
                    <SelectTrigger className="rounded-sm">
                        <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm">
                        {groupedSeasons.map(({ region, seasons }) => (
                            <React.Fragment key={region.id}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    {region.name}
                                </div>
                                {seasons.map(season => (
                                    <SelectItem key={season.id} value={season.id} className="rounded-sm">
                                        {season.name}
                                        {season.is_active && (
                                            <span className="ml-2 text-xs text-primary">(Active)</span>
                                        )}
                                    </SelectItem>
                                ))}
                            </React.Fragment>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {showMatchTypePicker && selectedMatchType && onMatchTypeChange && (
                <div>
                    <Label>Match Type</Label>
                    <Select value={selectedMatchType} onValueChange={onMatchTypeChange}>
                        <SelectTrigger className="rounded-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-sm">
                            <SelectItem value="season" className="rounded-sm">Season Matches</SelectItem>
                            <SelectItem value="playoff" className="rounded-sm">Playoff Matches</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {selectedMatchType === "season" && selectedWeek !== undefined && onWeekChange && (
                <div>
                    <Label>Week</Label>
                    <Select value={selectedWeek.toString()} onValueChange={(v) => onWeekChange(parseInt(v))}>
                        <SelectTrigger className="rounded-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-sm">
                            {Array.from({ length: maxWeeks }, (_, i) => i + 1).map(week => (
                                <SelectItem key={week} value={week.toString()} className="rounded-sm">
                                    Week {week}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {selectedMatchType === "playoff" && selectedRound !== undefined && onRoundChange && (
                <div>
                    <Label>Round</Label>
                    <Select value={selectedRound} onValueChange={onRoundChange}>
                        <SelectTrigger className="rounded-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-sm">
                            {availableRounds.map(round => (
                                <SelectItem key={round} value={round} className="rounded-sm">
                                    {ROUND_LABELS[round] || round}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
}