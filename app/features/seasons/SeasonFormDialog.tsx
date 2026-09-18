"use client";

import React, {useState, useEffect} from "react";
import {Button} from "@/app/components/ui/button";
import {Input} from "@/app/components/ui/input";
import {Label} from "@/app/components/ui/label";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/app/components/ui/dialog";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/app/components/ui/select";
import {createSeasonAction, updateSeasonAction} from "@/app/actions/season.actions";
import {mutateAllSeasons} from "@/app/hooks/useSeasons";
import {useRegions} from "@/app/hooks/useRegions";
import {usePlayoffConfigs} from "@/app/hooks/usePlayoffs";
import {SeasonWithPlayoffConfig} from "@/server/domains/season";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";

interface SeasonFormDialogProps {
    season?: SeasonWithPlayoffConfig;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

function toSlug(name: string): string {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function SeasonFormDialog({season, open, onOpenChange, onSuccess}: SeasonFormDialogProps) {
    const isEdit = !!season;
    const {regions, isLoading: regionsLoading} = useRegions();
    const {configs, isLoading: configsLoading} = usePlayoffConfigs();

    const [name, setName] = useState(season?.name ?? "");
    const [playoffConfigId, setPlayoffConfigId] = useState(season?.playoff_config_id ?? "");
    const [slug, setSlug] = useState(season?.slug ?? "");
    const [seasonNumber, setSeasonNumber] = useState(String(season?.season_number ?? ""));
    const [maxPlayers, setMaxPlayers] = useState(String(season?.max_players ?? 18));
    const [regionId, setRegionId] = useState(season?.region_id ?? "");
    const [startDate, setStartDate] = useState(season?.start_date ?? "");
    const [endDate, setEndDate] = useState(season?.end_date ?? "");
    const [leagueType, setLeagueType] = useState(season?.league_type ?? "main");
    const [loading, setLoading] = useState(false);
    const [slugManual, setSlugManual] = useState(isEdit);

    useEffect(() => {
        if (!open) return;
        setName(season?.name ?? "");
        setSlug(season?.slug ?? "");
        setSeasonNumber(String(season?.season_number ?? ""));
        setRegionId(season?.region_id ?? "");
        setMaxPlayers(String(season?.max_players ?? 18));
        setStartDate(season?.start_date ?? "");
        setEndDate(season?.end_date ?? "");
        setLeagueType(season?.league_type ?? "main")
        setPlayoffConfigId(season?.playoff_config_id ?? "");
        setSlugManual(isEdit);
        setLoading(false);
    }, [open]);

    const handleNameChange = (val: string) => {
        setName(val);
        if (!slugManual) setSlug(toSlug(val));
    };

    const handleSlugChange = (val: string) => {
        setSlug(val);
        setSlugManual(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !slug.trim() || !regionId || !startDate || !seasonNumber.trim()) {
            toast.error("Name, slug, region, start date, and season number are required");
            return;
        }
        setLoading(true);
        try {
            const result = isEdit
                ? await updateSeasonAction({
                    seasonId: season!.id,
                    name: name.trim(),
                    slug: slug.trim(),
                    seasonNumber: seasonNumber,
                    startDate,
                    maxPlayers: maxPlayers,
                    leagueType: leagueType,
                    endDate: endDate || null,
                    playoffConfigId: playoffConfigId || null,
                })
                : await createSeasonAction({
                    name: name.trim(),
                    slug: slug.trim(),
                    seasonNumber: seasonNumber,
                    regionId,
                    maxPlayers: maxPlayers,
                    startDate,
                    leagueType: leagueType,
                    endDate: endDate || null,
                    playoffConfigId: playoffConfigId || null,
                });

            if (!result.ok) {
                clientLogger.error("SeasonFormDialog", "Failed to save season", {error: result.error});
                toast.error("Failed to save season", result.error.message);
                return;
            }

            await mutateAllSeasons();
            toast.success(isEdit ? "Season updated" : "Season created");
            onOpenChange(false);
            onSuccess?.();
        } catch (err) {
            clientLogger.error("SeasonFormDialog", "Exception saving season", {err});
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] !max-w-lg rounded-sm" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Season" : "New Season"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label htmlFor="season-name">Name</Label>
                        <Input
                            id="season-name"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            disabled={loading}
                            className="rounded-sm"
                            placeholder="Asia Season 1"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="season-slug">Slug</Label>
                        <Input
                            id="season-slug"
                            value={slug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            disabled={loading}
                            className="rounded-sm font-mono"
                            placeholder="asia-s1"
                        />
                        <p className="text-xs text-muted-foreground">Used in URLs. Auto-generated from name.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="season-number">Season Number</Label>
                        <Input
                            id="season-number"
                            type="text"
                            inputMode="numeric"
                            value={seasonNumber}
                            onChange={(e) => setSeasonNumber(e.target.value)}
                            disabled={loading}
                            className="rounded-sm"
                            placeholder="1"
                        />
                        <p className="text-xs text-muted-foreground">Cross-region season key used by the Roblox game API.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Region</Label>
                        <Select value={regionId} onValueChange={setRegionId} disabled={loading || regionsLoading || isEdit}>
                            <SelectTrigger className="rounded-sm">
                                <SelectValue placeholder={regionsLoading ? "Loading..." : "Select region"} />
                            </SelectTrigger>
                            <SelectContent>
                                {regions.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>
                                        {r.code.toUpperCase()} — {r.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isEdit && (
                            <p className="text-xs text-muted-foreground">Region cannot be changed after creation.</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>League Type</Label>
                        <Select value={leagueType} onValueChange={setLeagueType} disabled={loading}>
                            <SelectTrigger className="rounded-sm">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={"main"}>
                                    Main League
                                </SelectItem>
                                <SelectItem value={"side"}>
                                    Side League
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Playoff Config <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Select
                            value={playoffConfigId || "none"}
                            onValueChange={(v) => setPlayoffConfigId(v === "none" ? "" : v)}
                            disabled={loading || configsLoading}
                        >
                            <SelectTrigger className="rounded-sm">
                                <SelectValue placeholder={configsLoading ? "Loading..." : "Select config"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {configs.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Determines the playoff bracket structure at generation.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="season-max-players">Max Players</Label>
                        <Input
                            id="season-max-players"
                            type="text"
                            inputMode="numeric"
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(e.target.value)}
                            disabled={loading}
                            className="rounded-sm"
                            placeholder="18"
                        />
                        <p className="text-xs text-muted-foreground">Total roster cap incl. leadership (min 3).</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="season-start">Start Date</Label>
                            <Input
                                id="season-start"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={loading}
                                className="rounded-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="season-end">
                                End Date <span className="text-muted-foreground text-xs">(optional)</span>
                            </Label>
                            <Input
                                id="season-end"
                                type="date"
                                value={endDate ?? ""}
                                onChange={(e) => setEndDate(e.target.value)}
                                disabled={loading}
                                className="rounded-sm"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <Button type="submit" disabled={loading} className="rounded-sm">
                            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Season"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                            className="rounded-sm"
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
