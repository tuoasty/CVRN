"use client";

import { usePublicContextStore } from "@/app/stores/publicContextStore";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useRegions } from "@/app/hooks/useRegions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import { Calendar } from "lucide-react";

export default function SeasonSelectionMiddleware() {
    const { selectedSeasonId, setSelectedSeasonId, setSelectedRegionId } = usePublicContextStore();
    const { seasons } = useSeasons();
    const { regions } = useRegions();

    const handleSeasonChange = (seasonId: string) => {
        const season = seasons.find((s) => s.id === seasonId);
        if (season) {
            setSelectedSeasonId(seasonId);
            setSelectedRegionId(season.region_id);
        }
    };

    const groupedSeasons = regions
        .map((region) => ({
            region,
            seasons: seasons.filter((s) => s.region_id === region.id),
        }))
        .filter((g) => g.seasons.length > 0);

    if (selectedSeasonId) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="panel p-8 max-w-md w-full border-2 border-primary/20">
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-sm bg-primary/10 border border-primary/20">
                        <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Select a Season
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Choose a season to view matches and standings
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                            Season
                        </label>
                        <Select value={selectedSeasonId || ""} onValueChange={handleSeasonChange}>
                            <SelectTrigger className="w-full rounded-sm">
                                <SelectValue placeholder="Select a season" />
                            </SelectTrigger>
                            <SelectContent className="rounded-sm">
                                {groupedSeasons.map(({ region, seasons }) => (
                                    <div key={region.id}>
                                        <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {region.name}
                                        </div>
                                        {seasons.map((season) => (
                                            <SelectItem key={season.id} value={season.id} className="rounded-sm">
                                                {season.name}
                                                {season.is_active && (
                                                    <span className="ml-2 text-xs text-primary">(Active)</span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </div>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
}