"use client";

import React, { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageOff, ChevronDown } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { TeamWithRegion } from "@/server/domains/team";
import { useTeams } from "@/app/hooks/useTeams";
import { clientLogger } from "@/app/utils/clientLogger";
import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { cn } from "@/lib/utils";
import UploadTeamLogoDialog from "@/app/features/teams/UploadTeamLogoDialog";
import { isSeasonActive } from "@/server/domains/season/helpers/isSeasonActive";

// Preferred button order; any other region codes are appended after these.
const REGION_ORDER = ["AS", "EU", "NA", "SA"];

type Scope = "all" | string; // "all" or a region id

export default function TeamsDataTable() {
    const { teams, isLoading, error } = useTeams();
    const { regions } = useRegions();
    const { seasons } = useSeasons();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [scope, setScope] = useState<Scope>("all");
    // Explicit past-season pick within a region; null = use active/latest.
    const [seasonOverride, setSeasonOverride] = useState<string | null>(null);
    const [seasonOpen, setSeasonOpen] = useState(false);
    const [, startTransition] = useTransition();

    const selectScope = (next: Scope) => {
        setScope(next);
        setSeasonOverride(null); // reset to the region's current season
    };

    // Regions ordered for the segmented control.
    const orderedRegions = useMemo(() => {
        return [...regions].sort((a, b) => {
            const ai = REGION_ORDER.indexOf(a.code.toUpperCase());
            const bi = REGION_ORDER.indexOf(b.code.toUpperCase());
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
    }, [regions]);

    // The active season for a region, falling back to the latest by start_date.
    const activeOrLatestByRegion = useMemo(() => {
        const map = new Map<string, string>(); // regionId -> seasonId
        for (const region of regions) {
            const regionSeasons = seasons.filter((s) => s.region_id === region.id);
            if (regionSeasons.length === 0) continue;
            const active = regionSeasons.find((s) => isSeasonActive(s));
            const chosen =
                active ??
                [...regionSeasons].sort((a, b) =>
                    (b.start_date ?? "").localeCompare(a.start_date ?? "")
                )[0];
            if (chosen) map.set(region.id, chosen.id);
        }
        return map;
    }, [regions, seasons]);

    // Seasons for the selected region, newest first (for the past-season picker).
    const regionSeasons = useMemo(() => {
        if (scope === "all") return [];
        return seasons
            .filter((s) => s.region_id === scope)
            .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
    }, [scope, seasons]);

    // The season actually shown when a region is selected.
    const effectiveSeasonId =
        scope === "all" ? null : seasonOverride ?? activeOrLatestByRegion.get(scope) ?? null;
    const effectiveSeason = regionSeasons.find((s) => s.id === effectiveSeasonId);

    // Season ids in scope: every region's current season, or just one region's.
    const allowedSeasonIds = useMemo(() => {
        if (scope === "all") return new Set(activeOrLatestByRegion.values());
        return new Set(effectiveSeasonId ? [effectiveSeasonId] : []);
    }, [scope, activeOrLatestByRegion, effectiveSeasonId]);

    const showSeasonColumn = scope === "all";

    // Past-season picker is only usable for a region with more than one season.
    const seasonPickerDisabled = scope === "all" || regionSeasons.length <= 1;
    const seasonButtonLabel =
        scope === "all" ? "All regions" : effectiveSeason?.name ?? "Season";
    const seasonDisabledReason =
        scope === "all"
            ? "Pick a region to change season"
            : regionSeasons.length <= 1
                ? "Only one season in this region"
                : undefined;

    const filteredTeams = teams.filter((team) => {
        const seasonId = team.seasons?.id;
        if (!seasonId || !allowedSeasonIds.has(seasonId)) return false;

        const searchLower = searchQuery.toLowerCase();
        return (
            team.name?.toLowerCase().includes(searchLower) ||
            team.seasons?.regions?.code?.toLowerCase().includes(searchLower) ||
            team.seasons?.regions?.name?.toLowerCase().includes(searchLower) ||
            team.seasons?.name?.toLowerCase().includes(searchLower)
        );
    });

    const handleTeamClick = (team: TeamWithRegion) => {
        if (!team.seasons?.regions?.code || !team.seasons?.slug) {
            clientLogger.warn("TeamsDataTable", "Cannot navigate - missing season or region data", { teamId: team.id });
            return;
        }

        const regionCode = encodeURIComponent(team.seasons.regions.code.toLowerCase());
        const seasonSlug = encodeURIComponent(team.seasons.slug.toLowerCase());
        const teamSlug = encodeURIComponent(team.slug.toLowerCase());

        startTransition(() => {
            router.push(`/admin/teams/${regionCode}/${seasonSlug}/${teamSlug}`);
        });
    };

    if (isLoading) {
        return (
            <div className="panel p-6">
                <p className="text-muted-foreground">Loading teams...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="panel p-6">
                <p className="text-destructive">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center h-9 rounded-sm border border-border bg-muted/50 p-0.5">
                    <button
                        onClick={() => selectScope("all")}
                        className={cn(
                            "px-3 h-full text-xs font-semibold rounded-sm transition-colors",
                            scope === "all"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        All
                    </button>
                    {orderedRegions.map((region) => (
                        <button
                            key={region.id}
                            onClick={() => selectScope(region.id)}
                            className={cn(
                                "px-3 h-full text-xs font-semibold rounded-sm transition-colors uppercase",
                                scope === region.id
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {region.code}
                        </button>
                    ))}
                </div>

                <Popover
                    open={seasonOpen && !seasonPickerDisabled}
                    onOpenChange={(next) => !seasonPickerDisabled && setSeasonOpen(next)}
                >
                    <PopoverTrigger asChild>
                        <button
                            disabled={seasonPickerDisabled}
                            title={seasonDisabledReason}
                            className={cn(
                                "flex items-center gap-1 h-8 px-2.5 rounded-sm border border-border bg-background text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                seasonPickerDisabled
                                    ? "text-muted-foreground/50 cursor-not-allowed"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span className={cn(!seasonPickerDisabled && "text-foreground")}>
                                {seasonButtonLabel}
                            </span>
                            {!seasonPickerDisabled && seasonOverride === null && (
                                <span className="text-[9px] text-primary font-semibold uppercase">Current</span>
                            )}
                            <ChevronDown className={cn(
                                "h-3 w-3 transition-transform duration-150",
                                seasonOpen && !seasonPickerDisabled && "rotate-180"
                            )} />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" sideOffset={6} className="w-44 p-1">
                            {regionSeasons.map((season) => {
                                const isCurrent = season.id === activeOrLatestByRegion.get(scope);
                                return (
                                    <button
                                        key={season.id}
                                        onClick={() => {
                                            setSeasonOverride(isCurrent ? null : season.id);
                                            setSeasonOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left text-xs px-2 py-1.5 rounded-sm transition-colors flex items-center justify-between",
                                            season.id === effectiveSeasonId
                                                ? "bg-primary/10 text-foreground border border-primary/20"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                    >
                                        {season.name}
                                        {isCurrent && (
                                            <span className="text-[9px] text-primary font-semibold uppercase ml-2">Current</span>
                                        )}
                                    </button>
                                );
                            })}
                        </PopoverContent>
                    </Popover>

                <div className="w-full sm:flex-1 sm:max-w-sm">
                    <Input
                        type="text"
                        placeholder="Search teams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-sm"
                    />
                </div>

                <div className="text-sm text-muted-foreground sm:ml-auto">
                    {filteredTeams.length} {filteredTeams.length === 1 ? "team" : "teams"}
                </div>
            </div>

            {filteredTeams.length === 0 ? (
                <div className="panel p-6">
                    <p className="text-muted-foreground text-center">No teams found</p>
                </div>
            ) : (
                <div className="panel overflow-x-auto">
                    <table className="table-dense">
                        <thead>
                            <tr>
                                <th className="w-10">Logo</th>
                                <th>Team Name</th>
                                {showSeasonColumn && <th className="w-16">Region</th>}
                                {showSeasonColumn && <th>Season</th>}
                                <th>Color</th>
                                <th className="w-20 text-right">Players</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeams.map((team) => {
                                const hasRequiredData = team.seasons?.regions?.code && team.seasons?.slug;
                                const seasonName = team.seasons?.name || "Unknown Season";

                                return (
                                    <tr
                                        key={team.id}
                                        className={`cursor-pointer hover:bg-muted/50 transition-colors${!hasRequiredData ? " opacity-50" : ""}`}
                                        onClick={() => hasRequiredData && handleTeamClick(team)}
                                    >
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <UploadTeamLogoDialog
                                                teamId={team.id}
                                                teamName={team.name || ""}
                                                currentLogoUrl={team.logo_url}
                                                trigger={
                                                    <button className="group relative block w-8 h-8 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                                        {team.logo_url ? (
                                                            <div className="relative w-8 h-8">
                                                                <Image
                                                                    src={team.logo_url}
                                                                    alt={team.name || ""}
                                                                    fill
                                                                    sizes="32px"
                                                                    className="object-contain transition-opacity group-hover:opacity-60"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-sm border border-dashed border-amber-500/60 bg-amber-500/10 group-hover:border-primary/50 transition-colors" title="Upload logo">
                                                                <ImageOff className="h-3.5 w-3.5 text-amber-500/70" />
                                                            </div>
                                                        )}
                                                    </button>
                                                }
                                            />
                                        </td>
                                        <td>
                                            <span className="font-medium">{team.name}</span>
                                        </td>
                                        {showSeasonColumn && (
                                            <td>
                                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide">
                                                    {team.seasons?.regions?.code ?? "—"}
                                                </span>
                                            </td>
                                        )}
                                        {showSeasonColumn && (
                                            <td className="text-sm text-muted-foreground">{seasonName}</td>
                                        )}
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {team.brick_color ? (
                                                    <>
                                                        <div
                                                            className="w-3.5 h-3.5 rounded-sm border border-border shrink-0"
                                                            style={{ backgroundColor: team.brick_color }}
                                                        />
                                                        <span className="text-xs font-mono text-muted-foreground">
                                                            {team.brick_color}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <span className="text-sm font-mono tabular-nums">
                                                {team.playerCount ?? "—"}<span className="text-muted-foreground">/18</span>
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
