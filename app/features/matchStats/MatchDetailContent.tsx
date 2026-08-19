"use client";

import {useState, useLayoutEffect, useMemo} from "react";
import {MatchDetail} from "@/server/domains/match";
import {POSITIONS} from "@/shared/volleyball/positions";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/app/components/ui/tabs";
import BoxScore from "@/app/features/matchStats/BoxScore";
import MatchHeader from "@/app/features/matchStats/MatchHeader";
import StatViewToggle from "@/app/features/matchStats/StatViewToggle";
import TeamSelectorBar, {TeamView} from "@/app/features/matchStats/TeamSelectorBar";
import PreMatchRosters from "@/app/features/matchStats/PreMatchRosters";
import MatchVodSection from "@/app/features/media/MatchVodSection";

type Props = {
    detail: MatchDetail;
    regionCode?: string;
    seasonSlug?: string;
};

export default function MatchDetailContent({detail, regionCode, seasonSlug}: Props) {
    const {match, sets, homeTeam, awayTeam, statSets, statTotals} = detail;
    const [view, setView] = useState<TeamView>("home-only");
    const [detailed, setDetailed] = useState(false);
    useLayoutEffect(() => {
        setDetailed(window.matchMedia("(min-width: 640px)").matches);
    }, []);

    const setCount = sets.length;
    const selectedTeam = view === "home-only" ? homeTeam : awayTeam;

    const positionsByPlayer = useMemo(() => {
        const rank = new Map(POSITIONS.map((p, i) => [p.code as string, i]));
        const byPlayer = new Map<string, Set<string>>();
        for (const s of statSets) {
            if (!s.position || !s.player_id) continue;
            const set = byPlayer.get(s.player_id) ?? new Set<string>();
            set.add(s.position);
            byPlayer.set(s.player_id, set);
        }
        const out = new Map<string, string[]>();
        for (const [playerId, set] of byPlayer) {
            out.set(
                playerId,
                [...set].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99)),
            );
        }
        return out;
    }, [statSets]);

    const isPlayable = match.status === "completed" && !match.is_forfeit;

    const hasStats = statTotals.length > 0;
    const vod = detail.mediaPosts.find(p => p.type === "video") ?? null;

    return (
        <div className="space-y-6">
            <MatchHeader detail={detail} regionCode={regionCode} seasonSlug={seasonSlug} standingMethod={detail.standingMethod} />

            {!isPlayable ? (
                match.is_forfeit || !detail.rosters ? (
                    <NonPlayableNotice match={match} />
                ) : (
                    <PreMatchRosters
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
                        rosters={detail.rosters}
                    />
                )
            ) : hasStats ? (
                <Tabs defaultValue="total" className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="total">Total</TabsTrigger>
                            {Array.from({length: setCount}, (_, i) => i + 1).map(n => (
                                <TabsTrigger key={n} value={`set-${n}`}>
                                    Set {n}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <StatViewToggle detailed={detailed} onDetailedChange={setDetailed} />
                    </div>

                    <TeamSelectorBar
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
                        view={view}
                        onViewChange={setView}
                    />

                    <TabsContent value="total" className="mt-0">
                        <BoxScore
                            homeTeam={homeTeam}
                            awayTeam={awayTeam}
                            rows={statTotals}
                            selectedTeam={selectedTeam}
                            detailed={detailed}
                            showSetsPlayed
                            positionsByPlayer={positionsByPlayer}
                        />
                    </TabsContent>
                    {Array.from({length: setCount}, (_, i) => i + 1).map(n => (
                        <TabsContent key={n} value={`set-${n}`} className="mt-0">
                            <BoxScore
                                homeTeam={homeTeam}
                                awayTeam={awayTeam}
                                rows={statSets.filter(r => r.set_number === n)}
                                selectedTeam={selectedTeam}
                                detailed={detailed}
                                showSetsPlayed={false}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            ) : null}

            {vod && <MatchVodSection post={vod} />}
        </div>
    );
}

function NonPlayableNotice({match}: {match: MatchDetail["match"]}) {
    if (match.is_forfeit) {
        return (
            <p className="text-sm text-muted-foreground py-4">
                This match was forfeited — no box score is available.
            </p>
        );
    }

    if (match.status === "pending" || match.status === "scheduled") {
        const when = match.scheduled_at
            ? new Date(match.scheduled_at).toLocaleString()
            : "Time TBD";
        return (
            <div className="space-y-1 py-4">
                <p className="text-sm">This match hasn&apos;t been played yet.</p>
                <p className="text-xs text-muted-foreground">Scheduled: {when}</p>
            </div>
        );
    }

    return null;
}
