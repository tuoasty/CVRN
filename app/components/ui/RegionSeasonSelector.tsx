"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { cn } from "@/lib/utils";
import { isSeasonActive } from "@/server/domains/season/helpers/isSeasonActive";

interface RegionSeasonSelectorProps {
    fullWidth?: boolean;
}

export default function RegionSeasonSelector({ fullWidth }: RegionSeasonSelectorProps) {
    const router = useRouter();
    const params = useParams<{ region?: string; season?: string }>();
    const pathname = usePathname();
    const { regions } = useRegions();
    const { seasons } = useSeasons();

    const [open, setOpen] = useState(false);
    const [tabRegionId, setTabRegionId] = useState<string | null>(null);

    const selectedRegion = regions.find(r => r.code.toLowerCase() === params.region?.toLowerCase());
    const selectedSeason = seasons.find(s => s.slug === params.season && s.region_id === selectedRegion?.id);

    const activeTabId = tabRegionId ?? selectedRegion?.id ?? regions[0]?.id;
    const tabSeasons = seasons.filter(s => s.region_id === activeTabId);

    const handleOpenChange = (next: boolean) => {
        if (next) setTabRegionId(selectedRegion?.id ?? null);
        setOpen(next);
    };

    const handleSeasonSelect = (seasonId: string) => {
        const season = seasons.find(s => s.id === seasonId);
        if (season) {
            const region = regions.find(r => r.id === season.region_id);
            if (region) {
                const base = `/${params.region}/${params.season}`;
                const rest = pathname.startsWith(base + "/")
                    ? pathname.slice(base.length + 1).split("/")[0]
                    : "";
                router.push(`/${region.code.toLowerCase()}/${season.slug}${rest ? `/${rest}` : ""}`);
            }
        }
        setOpen(false);
    };

    useEffect(() => {
        if (params.region && params.season) {
            document.cookie = `cvrn_last_ctx=${params.region}:${params.season};path=/;max-age=31536000;samesite=lax`;
        }
    }, [params.region, params.season]);

    if (!params.region || !params.season) return null;

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button className={cn(
                    "flex items-center h-9 border border-border rounded-sm overflow-hidden bg-background text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    fullWidth && "w-full"
                )}>
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 self-stretch flex items-center tracking-wide uppercase shrink-0">
                        {selectedRegion?.code ?? "—"}
                    </span>
                    <span className="w-px self-stretch bg-border shrink-0" />
                    <span className={cn("text-foreground px-2.5 whitespace-nowrap", fullWidth && "flex-1")}>
                        {selectedSeason?.name ?? "Select Season"}
                    </span>
                    <ChevronDown className={cn(
                        "h-3.5 w-3.5 text-muted-foreground mr-2 ml-0.5 transition-transform duration-150",
                        open && "rotate-180"
                    )} />
                </button>
            </PopoverTrigger>
            <PopoverContent align={fullWidth ? "start" : "end"} sideOffset={6} className={fullWidth ? "w-[var(--radix-popover-trigger-width)] p-3" : "w-44 p-3"}>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5 font-semibold">Region</p>
                <div className="grid grid-cols-4 gap-1 mb-3">
                    {regions.map(region => (
                        <button
                            key={region.id}
                            onClick={() => setTabRegionId(region.id)}
                            className={cn(
                                "text-[10px] font-bold py-1.5 rounded-sm transition-colors",
                                activeTabId === region.id
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground"
                            )}
                        >
                            {region.code}
                        </button>
                    ))}
                </div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5 font-semibold">Season</p>
                <div className="flex flex-col gap-0.5">
                    {tabSeasons.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2 py-1.5">No seasons</p>
                    ) : tabSeasons.map(season => (
                        <button
                            key={season.id}
                            onClick={() => handleSeasonSelect(season.id)}
                            className={cn(
                                "text-left text-xs px-2 py-1.5 rounded-sm transition-colors flex items-center justify-between",
                                season.slug === params.season && season.region_id === selectedRegion?.id
                                    ? "bg-primary/10 text-foreground border border-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {season.name}
                            {isSeasonActive(season) && (
                                <span className="text-[9px] text-primary font-semibold ml-2">Active</span>
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
