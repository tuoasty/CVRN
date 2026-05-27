"use client";

import {useState, useEffect} from "react";
import {MatchDetail} from "@/server/domains/match";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/app/components/ui/tabs";
import BoxScore from "@/app/features/matchStats/BoxScore";
import MatchHeader from "@/app/features/matchStats/MatchHeader";
import StatViewToggle from "@/app/features/matchStats/StatViewToggle";
import TeamSelectorBar, {TeamView} from "@/app/features/matchStats/TeamSelectorBar";

type Props = {
    detail: MatchDetail;
    regionCode?: string;
    seasonSlug?: string;
};

export default function MatchDetailContent({detail, regionCode, seasonSlug}: Props) {
    const {match, sets, homeTeam, awayTeam, statSets, statTotals} = detail;
    const [view, setView] = useState<TeamView>("home-only");
    const [detailed, setDetailed] = useState(false);
    useEffect(() => {
        if (window.matchMedia("(min-width: 640px)").matches) setDetailed(true);
    }, []);

    const setCount = sets.length;
    const selectedTeam = view === "home-only" ? homeTeam : awayTeam;

    const isPlayable = match.status === "completed" && !match.is_forfeit;

    return (
        <div className="space-y-6">
            <MatchHeader detail={detail} regionCode={regionCode} seasonSlug={seasonSlug} />

            {!isPlayable ? (
                <NonPlayableNotice match={match} />
            ) : (
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
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}

function NonPlayableNotice({match}: {match: MatchDetail["match"]}) {
    if (match.is_forfeit) {
        return (
            <div className="panel p-6">
                <p className="text-sm text-muted-foreground">
                    This match was forfeited — no box score is available.
                </p>
            </div>
        );
    }

    if (match.status === "pending" || match.status === "scheduled") {
        const when = match.scheduled_at
            ? new Date(match.scheduled_at).toLocaleString()
            : "Time TBD";
        return (
            <div className="panel p-6 space-y-1">
                <p className="text-sm">This match hasn&apos;t been played yet.</p>
                <p className="text-xs text-muted-foreground">Scheduled: {when}</p>
            </div>
        );
    }

    return null;
}
