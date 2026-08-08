"use client";

import { useMemo } from "react";
import { useSeasonContext } from "@/app/(public)/[region]/[season]/context";
import { buildIncomingMap } from "@/app/hooks/usePlayoffs";
import { PlayoffBracketDisplay } from "@/app/features/playoffs/PlayoffBracketDisplay";
import { Trophy } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import type { PlayoffBracket, Match } from "@/shared/types/db";
import type { TeamWithRegion } from "@/server/domains/team";

type Props = {
    brackets: PlayoffBracket[];

    matches: Match[];

    teams: TeamWithRegion[];
};

export default function PlayoffsPage({ brackets, matches, teams }: Props) {
    const { season, region } = useSeasonContext();
    const hasPlayoffs = season.playoff_started;
    const isCompleted = season.end_date
        ? new Date(season.end_date) < new Date()
        : false;

    const incomingMap = useMemo(() => buildIncomingMap(brackets), [brackets]);

    return (
        <>
            <div className="page-wide space-y-6 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                            <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold uppercase tracking-wider text-foreground">
                                    Playoffs
                                </h1>
                                {hasPlayoffs && (
                                    <Badge
                                        variant="outline"
                                        className={`rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider ${
                                            isCompleted
                                                ? "bg-green-600/10 text-green-600 border-green-600/20"
                                                : "bg-blue-600/10 text-blue-600 border-blue-600/20"
                                        }`}
                                    >
                                        {isCompleted ? "Completed" : "In Progress"}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                    {season.name} · {region.name}
                                </p>
                        </div>
                    </div>
                </div>

                {!hasPlayoffs ? (

                    <div className="panel p-6 sm:p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                Playoffs have not started for this season
                            </p>
                        </div>
                    </div>
                ) : brackets.length === 0 ? (
                    <div className="panel p-6 sm:p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                No bracket data found
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>

            {hasPlayoffs && (
                <div className="page-bleed pb-6">
                    {brackets.length > 0 ? (
                        <PlayoffBracketDisplay
                            brackets={brackets}
                            incomingMap={incomingMap}
                            teams={teams}
                            matches={matches}
                            regionCode={region.code}
                            seasonSlug={season.slug}
                            linkContext="public"
                        />
                    ) : null}
                </div>
            )}
        </>
    );
}