// /app/components/ui/RegionSeasonSelector.tsx

"use client";

import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { usePublicContextStore } from "@/app/stores/publicContextStore";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";

export default function RegionSeasonSelector() {
    const { regions } = useRegions();
    const { seasons } = useSeasons();
    const { selectedSeasonId, setSelectedSeasonId, setSelectedRegionId } =
        usePublicContextStore();

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

    const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);
    const selectedRegion = selectedSeason
        ? regions.find((r) => r.id === selectedSeason.region_id)
        : null;

    const displayValue = selectedSeason && selectedRegion
        ? `${selectedRegion.code} - ${selectedSeason.name}`
        : "Select Season";

    return (
        <Select value={selectedSeasonId || ""} onValueChange={handleSeasonChange}>
            <SelectTrigger className="w-[180px] h-9 rounded-sm text-sm">
                <SelectValue placeholder="Select Season">
                    {displayValue}
                </SelectValue>
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
    );
}