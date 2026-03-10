"use client";

import { useEffect, useState } from "react";
import { usePublicContextStore } from "@/app/stores/publicContextStore";
import { usePlayoffStore } from "@/app/stores/playoffStore";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { useRegionsStore } from "@/app/stores/regionStore";
import { PlayoffBracketDisplay } from "@/app/features/playoffs/PlayoffBracketDisplay";
import RegionSeasonSelector from "@/app/components/ui/RegionSeasonSelector";
import SeasonSelectionMiddleware from "@/app/components/ui/SeasonSelectorMiddleware";
import { Trophy, Loader2 } from "lucide-react";
import { PlayoffBracket } from "@/shared/types/db";
import { toast } from "@/app/utils/toast";
import { Badge } from "@/app/components/ui/badge";

export default function PlayoffsPage() {
    const { selectedSeasonId } = usePublicContextStore();
    const { fetchBrackets } = usePlayoffStore();
    const { allSeasonsCache } = useSeasonsStore();
    const { allRegionsCache } = useRegionsStore();

    const [brackets, setBrackets] = useState<PlayoffBracket[]>([]);
    const [loadingBrackets, setLoadingBrackets] = useState(false);

    const selectedSeason = allSeasonsCache?.data?.find(s => s.id === selectedSeasonId);
    const selectedRegion = allRegionsCache?.data?.find(r => r.id === selectedSeason?.region_id);
    const hasPlayoffs = selectedSeason?.playoff_started;
    const isCompleted = selectedSeason?.playoff_completed;

    useEffect(() => {
        if (!selectedSeasonId || !hasPlayoffs) {
            setBrackets([]);
            return;
        }

        setLoadingBrackets(true);
        fetchBrackets(selectedSeasonId)
            .then(setBrackets)
            .catch((error) => toast.error("Failed to load brackets", error.message))
            .finally(() => setLoadingBrackets(false));
    }, [selectedSeasonId, hasPlayoffs]);

    return (
        <>
            <SeasonSelectionMiddleware />

            <div className="space-y-6 py-6">
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
                            {selectedSeason && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {selectedSeason.name}
                                    {selectedRegion && ` · ${selectedRegion.name}`}
                                </p>
                            )}
                        </div>
                    </div>
                    <RegionSeasonSelector />
                </div>

                {!selectedSeasonId ? (
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                Select a season to view playoffs
                            </p>
                        </div>
                    </div>
                ) : !hasPlayoffs ? (
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                Playoffs have not started for this season
                            </p>
                        </div>
                    </div>
                ) : loadingBrackets ? (
                    <div className="panel p-12 border-l-4 border-l-primary/30">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading bracket...</p>
                        </div>
                    </div>
                ) : brackets.length === 0 ? (
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                No bracket data found
                            </p>
                        </div>
                    </div>
                ) : (
                    <PlayoffBracketDisplay
                        brackets={brackets}
                        seasonId={selectedSeasonId}
                        regionId={selectedSeason.region_id}
                    />
                )}
            </div>
        </>
    );
}