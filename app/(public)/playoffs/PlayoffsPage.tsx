"use client";


import { useSeasonContext } from "@/app/(public)/[region]/[season]/context";
import { usePlayoffBrackets } from "@/app/hooks/usePlayoffs";
import { PlayoffBracketDisplay } from "@/app/features/playoffs/PlayoffBracketDisplay";
import { Trophy } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function PlayoffsPage() {
    const { season, region } = useSeasonContext();
    const hasPlayoffs = season.playoff_started;
    const isCompleted = season.end_date
        ? new Date(season.end_date) < new Date()
        : false;

    const { brackets, isLoading: loadingBrackets } = usePlayoffBrackets(
        hasPlayoffs ? season.id : null
    );

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
                                <h1 className="text-xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
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
                ) : loadingBrackets ? null : brackets.length === 0 ? (
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
                    {loadingBrackets ? (
                        <div className="flex gap-6 justify-center overflow-x-auto py-4 px-4">
                            {[4, 2, 1].map((count, col) => (
                                <div key={col} className="flex flex-col gap-8 shrink-0">
                                    {[...Array(count)].map((_, i) => (
                                        <Skeleton key={i} className="h-24 w-48 rounded-sm" />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : brackets.length > 0 ? (
                        <PlayoffBracketDisplay
                            brackets={brackets}
                            seasonId={season.id}
                            regionId={season.region_id}
                            linkContext="public"
                        />
                    ) : null}
                </div>
            )}
        </>
    );
}