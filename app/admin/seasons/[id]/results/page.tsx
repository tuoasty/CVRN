"use client";

import React, {useState, useEffect, useCallback, useRef} from "react";
import Image from "next/image";
import Link from "next/link";
import {useParams} from "next/navigation";
import {Trophy, Medal, Award, Plus, Trash2, RefreshCw, Search, ImageIcon, ChevronLeft, ChevronUp, ChevronDown, Star} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from "@/app/components/ui/dialog";
import {Button} from "@/app/components/ui/button";
import {Badge} from "@/app/components/ui/badge";
import {Input} from "@/app/components/ui/input";
import {Label} from "@/app/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/app/components/ui/select";
import {SeasonPodiumEntryWithTeam, SeasonAwardEntryWithPlayer, AwardCategory} from "@/server/domains/season";
import {PlayerWithTeamInfo} from "@/server/domains/player";
import {SpecWithRequirements, SpecWinnerWithRefs} from "@/server/domains/spec";
import {Season} from "@/shared/types/db";
import {
    getSeasonByIdAction,
    getSeasonPodiumAction,
    getSeasonAwardsAction,
    deriveAndSaveSeasonPodiumAction,
    upsertSeasonPodiumSlotAction,
    deleteSeasonPodiumSlotAction,
    deleteSeasonAwardAction,
    previewAwardAvatarAction,
    saveAwardAvatarAction,
    fetchChampionRosterAwardsAction,
    batchUpsertSeasonAwardsAction,
    updateSeasonAwardAction,
    reorderSeasonAwardsAction,
} from "@/app/actions/season.actions";
import {searchPlayersInDatabaseAction} from "@/app/actions/player.actions";
import {
    getSpecsAction,
    getSpecWinnersAction,
    awardSpecWinnerAction,
    deleteSpecWinnerAction,
} from "@/app/actions/spec.actions";
import {useTeamsBySeason} from "@/app/hooks/useTeams";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";
import {formatPlacement, ordinalSuffix} from "@/app/utils/placement";
import ChampionGfxBlock from "@/app/features/seasons/ChampionGfxBlock";

function placeMeta(place: number, groupSize: number): {label: string; color: string; Icon: typeof Trophy} {
    if (place === 1) return {label: "Champion", color: "text-secondary", Icon: Trophy};
    if (place === 2) return {label: "Runner-Up", color: "text-muted-foreground", Icon: Medal};
    if (place === 3) return {label: "3rd Place", color: "text-muted-foreground", Icon: Medal};
    return {label: `${formatPlacement(place, groupSize)} Place`, color: "text-muted-foreground", Icon: Award};
}

const CATEGORY_LABELS: Record<AwardCategory, string> = {
    individual_winners: "Individual Awards",
    first_team: "First Team",
    staff_team: "Staff Team",
    champion_roster: "Champion Roster",
};

const CATEGORY_ORDER: AwardCategory[] = ["individual_winners", "first_team", "staff_team", "champion_roster"];

function PlayerSearchInput({seasonId, onSelect}: {seasonId: string; onSelect: (player: PlayerWithTeamInfo) => void}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PlayerWithTeamInfo[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!q.trim()) { setResults([]); return; }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await searchPlayersInDatabaseAction({query: q.trim(), seasonId});
                if (res.ok) setResults(res.value.slice(0, 8));
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const handleSelect = (player: PlayerWithTeamInfo) => {
        onSelect(player);
        setQuery(player.username ?? player.id);
        setResults([]);
    };

    return (
        <div className="relative flex-1 min-w-72">
            <Label className="text-xs">Player</Label>
            <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    className="rounded-sm h-8 text-sm pl-7"
                    placeholder="Search username or display name..."
                    value={query}
                    onChange={handleChange}
                />
            </div>
            {(results.length > 0 || searching) && (
                <div className="absolute z-50 top-full mt-1 w-full rounded-sm border border-border bg-popover shadow-md">
                    {searching && <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>}
                    {results.map(p => (
                        <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center justify-between gap-3"
                            onClick={() => handleSelect(p)}
                        >
                            <span className="flex flex-col min-w-0">
                                <span className="font-medium truncate">{p.display_name ?? p.username}</span>
                                <span className="text-[10px] text-muted-foreground truncate">@{p.username}</span>
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                                {p.season_team_name ?? "—"}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function SpecSearchInput({specs, selectedSpec, onSelect}: {specs: SpecWithRequirements[]; selectedSpec: SpecWithRequirements | null; onSelect: (spec: SpecWithRequirements) => void}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const q = query.trim().toLowerCase();
    const results = (q
        ? specs.filter(s => s.name.toLowerCase().includes(q) || s.position.toLowerCase().includes(q))
        : specs
    ).slice(0, 8);

    const handleSelect = (spec: SpecWithRequirements) => {
        onSelect(spec);
        setQuery(spec.name);
        setOpen(false);
    };

    return (
        <div className="relative flex-1 min-w-72">
            <Label className="text-xs">Spec</Label>
            <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    className="rounded-sm h-8 text-sm pl-7"
                    placeholder={selectedSpec ? `${selectedSpec.name} · ${selectedSpec.position}` : "Search specs..."}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                />
            </div>
            {open && results.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full rounded-sm border border-border bg-popover shadow-md max-h-64 overflow-y-auto">
                    {results.map(s => (
                        <button
                            key={s.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center justify-between gap-3"
                            onClick={() => handleSelect(s)}
                        >
                            <span className="font-medium truncate">{s.name}</span>
                            <span className="flex items-center gap-2 shrink-0 text-xs">
                                <span className="text-secondary font-mono tabular-nums">{s.stars}★</span>
                                <span className="text-muted-foreground">{s.position}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function StarRow({value, max, onChange, disabled}: {value: number; max?: number; onChange: (n: number) => void; disabled?: boolean}) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(value === n ? 0 : n)}
                    className="text-lg leading-none disabled:opacity-40 disabled:cursor-not-allowed"
                    title={`${n} star${n === 1 ? "" : "s"}`}
                >
                    <span className={n <= value ? "text-secondary" : "text-muted-foreground/40"}>★</span>
                </button>
            ))}
            {typeof max === "number" && (
                <span className="text-xs text-muted-foreground ml-1 font-mono tabular-nums">{value} of {max}</span>
            )}
        </div>
    );
}

interface AvatarPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    playerName: string;
    cdnUrl: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
    confirming: boolean;
}

function AvatarPreviewDialog({open, onOpenChange, playerName, cdnUrl, confirmLabel, onConfirm, confirming}: AvatarPreviewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-sm max-w-xs">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold uppercase tracking-wider">
                        Confirm Avatar
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-3 py-2">
                    <div className="relative w-32 aspect-[3/4] rounded-sm overflow-hidden bg-primary/10">
                        <Image
                            src={cdnUrl}
                            alt={playerName}
                            fill
                            className="object-cover object-top"
                            sizes="128px"
                            unoptimized
                        />
                    </div>
                    <p className="text-sm text-center">
                        <span className="font-semibold">{playerName}</span>
                        <br />
                        <span className="text-xs text-muted-foreground">This avatar will be saved permanently.</span>
                    </p>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" size="sm" className="rounded-sm" onClick={() => onOpenChange(false)} disabled={confirming}>
                        Cancel
                    </Button>
                    <Button size="sm" className="rounded-sm" onClick={onConfirm} disabled={confirming}>
                        {confirming ? "Saving..." : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AwardAvatarCell({url}: {url: string | null}) {
    if (!url) {
        return (
            <div className="w-8 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
        );
    }
    return (
        <div className="relative w-8 h-10 rounded-sm overflow-hidden bg-primary/10">
            <Image src={url} alt="avatar" fill className="object-cover object-top" sizes="32px" unoptimized />
        </div>
    );
}

function AwardNameEditor({value, onSave}: {value: string; onSave: (v: string) => void}) {
    const [text, setText] = useState(value);
    useEffect(() => { setText(value); }, [value]);
    const commit = () => {
        const t = text.trim();
        if (t && t !== value) onSave(t);
        else setText(value);
    };
    return (
        <Input
            className="rounded-sm h-7 text-sm"
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { setText(value); e.currentTarget.blur(); }
            }}
        />
    );
}

export default function SeasonResultsPage() {
    const params = useParams();
    const seasonId = params.id as string;

    const [season, setSeason] = useState<Season | null>(null);
    const [podium, setPodium] = useState<SeasonPodiumEntryWithTeam[]>([]);
    const [awards, setAwards] = useState<SeasonAwardEntryWithPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [deriving, setDeriving] = useState(false);
    const [fetchingRoster, setFetchingRoster] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [deletingAward, setDeletingAward] = useState<string | null>(null);
    const [addPlace, setAddPlace] = useState<number>(1);
    const [addTeamId, setAddTeamId] = useState<string>("");

    const [previewLoading, setPreviewLoading] = useState<string | null>(null);

    const [draftAwards, setDraftAwards] = useState<{tempId: string; awardName: string; category: AwardCategory; player: PlayerWithTeamInfo}[]>([]);
    const [draftName, setDraftName] = useState("");
    const [draftCategory, setDraftCategory] = useState<AwardCategory>("individual_winners");
    const [draftPlayer, setDraftPlayer] = useState<PlayerWithTeamInfo | null>(null);
    const [draftKey, setDraftKey] = useState(0);
    const [savingBatch, setSavingBatch] = useState(false);
    const [reordering, setReordering] = useState(false);

    const [previewDialog, setPreviewDialog] = useState<{
        playerName: string;
        cdnUrl: string;
        awardId: string;
    } | null>(null);
    const [confirming, setConfirming] = useState(false);

    const [specs, setSpecs] = useState<SpecWithRequirements[]>([]);
    const [specWinners, setSpecWinners] = useState<SpecWinnerWithRefs[]>([]);
    const [selectedSpecId, setSelectedSpecId] = useState<string>("");
    const [specPlayer, setSpecPlayer] = useState<PlayerWithTeamInfo | null>(null);
    const [specStars, setSpecStars] = useState<number>(0);
    const [savingSpec, setSavingSpec] = useState(false);
    const [deletingSpecWinner, setDeletingSpecWinner] = useState<string | null>(null);
    const [updatingSpecWinner, setUpdatingSpecWinner] = useState<string | null>(null);
    const [specFormKey, setSpecFormKey] = useState(0);

    const {teams: seasonTeams} = useTeamsBySeason(seasonId);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [sRes, pRes, aRes, specRes, winRes] = await Promise.all([
                getSeasonByIdAction({seasonId}),
                getSeasonPodiumAction({seasonId}),
                getSeasonAwardsAction({seasonId}),
                getSpecsAction(),
                getSpecWinnersAction(seasonId),
            ]);
            if (sRes.ok) setSeason(sRes.value);
            if (pRes.ok) setPodium(pRes.value);
            if (aRes.ok) setAwards(aRes.value);
            if (specRes.ok) setSpecs(specRes.value);
            if (winRes.ok) setSpecWinners(winRes.value);
        } finally {
            setLoading(false);
        }
    }, [seasonId]);

    useEffect(() => { load(); }, [load]);

    const reloadAwards = useCallback(async () => {
        const res = await getSeasonAwardsAction({seasonId});
        if (res.ok) setAwards(res.value);
    }, [seasonId]);

    const handleDerive = async () => {
        setDeriving(true);
        try {
            const result = await deriveAndSaveSeasonPodiumAction({seasonId});
            if (!result.ok) { toast.error("Could not auto-derive podium", result.error.message); return; }
            toast.success(result.value.skipped
                ? "Podium already set — clear slots first to re-derive"
                : "Podium derived from playoffs"
            );
            await load();
        } catch (err) {
            clientLogger.error("SeasonResultsPage", "Error deriving podium", {err});
            toast.error("Something went wrong");
        } finally {
            setDeriving(false);
        }
    };

    const handleAddPlacement = async () => {
        if (!addTeamId) return;
        setSaving("add");
        try {
            const result = await upsertSeasonPodiumSlotAction({seasonId, place: addPlace, teamId: addTeamId, isOverride: true});
            if (!result.ok) { toast.error("Failed to save placement", result.error.message); return; }
            toast.success(`${ordinalSuffix(addPlace)} placement saved`);
            setAddTeamId("");
            await load();
        } finally { setSaving(null); }
    };

    const handleDeletePlacement = async (teamId: string) => {
        setSaving(teamId);
        try {
            const result = await deleteSeasonPodiumSlotAction({seasonId, teamId});
            if (!result.ok) { toast.error("Failed to remove placement", result.error.message); return; }
            await load();
        } finally { setSaving(null); }
    };

    const handleFetchRoster = async () => {
        setFetchingRoster(true);
        try {
            const result = await fetchChampionRosterAwardsAction({seasonId});
            if (!result.ok) { toast.error("Failed to fetch champion roster", result.error.message); return; }
            if (result.value.skipped) {
                toast.info("No champion found — set podium first");
            } else {
                toast.success(`Champion roster saved (${result.value.count} players)`);
            }
            await reloadAwards();
        } catch (err) {
            clientLogger.error("SeasonResultsPage", "Error fetching champion roster", {err});
            toast.error("Something went wrong");
        } finally {
            setFetchingRoster(false);
        }
    };

    const handleAddToDraft = () => {
        if (!draftName.trim() || !draftPlayer) return;
        setDraftAwards(prev => [
            ...prev,
            {tempId: crypto.randomUUID(), awardName: draftName.trim(), category: draftCategory, player: draftPlayer},
        ]);
        setDraftName("");
        setDraftPlayer(null);
        setDraftKey(k => k + 1);
    };

    const handleRemoveDraft = (tempId: string) => {
        setDraftAwards(prev => prev.filter(d => d.tempId !== tempId));
    };

    const handleSaveBatch = async () => {
        if (draftAwards.length === 0) return;
        setSavingBatch(true);
        try {
            const result = await batchUpsertSeasonAwardsAction({
                seasonId,
                awards: draftAwards.map(d => ({playerId: d.player.id, awardName: d.awardName, category: d.category})),
            });
            if (!result.ok) { toast.error("Failed to save awards", result.error.message); return; }
            setAwards(result.value);
            toast.success(`${draftAwards.length} award${draftAwards.length === 1 ? "" : "s"} saved`);
            setDraftAwards([]);
        } finally { setSavingBatch(false); }
    };

    const handleRenameAward = async (awardId: string, awardName: string) => {
        setAwards(prev => prev.map(a => (a.id === awardId ? {...a, award_name: awardName} : a)));
        const result = await updateSeasonAwardAction({awardId, awardName});
        if (!result.ok) {
            toast.error("Failed to rename award", result.error.message);
            await reloadAwards();
        }
    };

    const handleMoveAward = async (award: SeasonAwardEntryWithPlayer, direction: "up" | "down") => {
        const group = awards
            .filter(a => a.category === award.category)
            .sort((a, b) => a.sort_order - b.sort_order);
        const idx = group.findIndex(a => a.id === award.id);
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= group.length) return;
        const other = group[swapIdx];
        setReordering(true);
        setAwards(prev => prev.map(a =>
            a.id === award.id ? {...a, sort_order: other.sort_order}
                : a.id === other.id ? {...a, sort_order: award.sort_order}
                    : a
        ));
        try {
            const result = await reorderSeasonAwardsAction({
                updates: [
                    {id: award.id, sortOrder: other.sort_order},
                    {id: other.id, sortOrder: award.sort_order},
                ],
            });
            if (!result.ok) {
                toast.error("Failed to reorder", result.error.message);
                setAwards(prev => prev.map(a =>
                    a.id === award.id ? {...a, sort_order: award.sort_order}
                        : a.id === other.id ? {...a, sort_order: other.sort_order}
                            : a
                ));
            }
        } finally { setReordering(false); }
    };

    const handlePreviewForRefresh = async (award: SeasonAwardEntryWithPlayer) => {
        setPreviewLoading(award.id);
        try {
            const res = await previewAwardAvatarAction({playerId: award.players.id});
            if (!res.ok) { toast.error("Could not fetch avatar", res.error.message); return; }
            setPreviewDialog({playerName: award.players.username, cdnUrl: res.value.cdnUrl, awardId: award.id});
        } finally {
            setPreviewLoading(null);
        }
    };

    const handleConfirm = async () => {
        if (!previewDialog) return;
        setConfirming(true);
        try {
            const result = await saveAwardAvatarAction({awardId: previewDialog.awardId, cdnUrl: previewDialog.cdnUrl});
            if (!result.ok) { toast.error("Failed to update avatar", result.error.message); return; }
            toast.success("Avatar updated");
            setPreviewDialog(null);
            await reloadAwards();
        } finally {
            setConfirming(false);
        }
    };

    const handleDeleteAward = async (awardId: string) => {
        setDeletingAward(awardId);
        try {
            const result = await deleteSeasonAwardAction({awardId});
            if (!result.ok) { toast.error("Failed to delete award", result.error.message); return; }
            setAwards(prev => prev.filter(a => a.id !== awardId));
        } finally { setDeletingAward(null); }
    };

    const selectedSpec = specs.find(s => s.id === selectedSpecId) ?? null;

    const handleSelectSpec = (specId: string) => {
        setSelectedSpecId(specId);
        const spec = specs.find(s => s.id === specId);
        setSpecStars(spec ? spec.stars : 0);
    };

    const handleAwardSpec = async () => {
        if (!selectedSpecId || !specPlayer) return;
        setSavingSpec(true);
        try {
            const result = await awardSpecWinnerAction({
                seasonId,
                specId: selectedSpecId,
                playerId: specPlayer.id,
                starsAwarded: specStars,
            });
            if (!result.ok) { toast.error("Failed to award spec", result.error.message); return; }
            setSpecWinners(prev => [
                result.value,
                ...prev.filter(w => w.spec_id !== result.value.spec_id),
            ].sort((a, b) => b.stars_awarded - a.stars_awarded));
            toast.success("Spec winner saved");
            setSelectedSpecId("");
            setSpecPlayer(null);
            setSpecStars(0);
            setSpecFormKey(k => k + 1);
        } finally { setSavingSpec(false); }
    };

    const handleUpdateSpecStars = async (w: SpecWinnerWithRefs, stars: number) => {
        if (stars === w.stars_awarded) return;
        setUpdatingSpecWinner(w.id);
        try {
            const result = await awardSpecWinnerAction({
                seasonId,
                specId: w.spec_id,
                playerId: w.player_id,
                starsAwarded: stars,
            });
            if (!result.ok) { toast.error("Failed to update stars", result.error.message); return; }
            setSpecWinners(prev =>
                prev
                    .map(x => (x.id === result.value.id ? result.value : x))
                    .sort((a, b) => b.stars_awarded - a.stars_awarded)
            );
        } finally { setUpdatingSpecWinner(null); }
    };

    const handleDeleteSpecWinner = async (id: string) => {
        setDeletingSpecWinner(id);
        try {
            const result = await deleteSpecWinnerAction({id});
            if (!result.ok) { toast.error("Failed to remove spec winner", result.error.message); return; }
            setSpecWinners(prev => prev.filter(w => w.id !== id));
        } finally { setDeletingSpecWinner(null); }
    };

    const ROSTER_ROLE_RANK: Record<string, number> = {captain: 0, vice_captain: 1, court_captain: 2};
    const groupedAwards = CATEGORY_ORDER.reduce((acc, cat) => {
        const group = awards.filter(a => a.category === cat);
        if (cat === "champion_roster") {
            group.sort((a, b) => (ROSTER_ROLE_RANK[a.award_name] ?? 3) - (ROSTER_ROLE_RANK[b.award_name] ?? 3));
        } else {
            group.sort((a, b) => a.sort_order - b.sort_order);
        }
        acc[cat] = group;
        return acc;
    }, {} as Record<AwardCategory, SeasonAwardEntryWithPlayer[]>);

    return (
        <div className="admin-container">
            <div className="admin-section space-y-6">
                <div>
                    <Link
                        href="/admin/seasons"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Back to Seasons
                    </Link>
                    <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                        <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                            <Trophy className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">
                                {loading ? "Loading..." : (season?.name ?? "Season Results")}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Podium and awards management</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Final Placements</h2>
                        {season?.end_date && (
                            <Button variant="outline" size="sm" className="rounded-sm gap-2 text-xs"
                                onClick={handleDerive} disabled={deriving || loading}
                            >
                                <RefreshCw className={`h-3 w-3 ${deriving ? "animate-spin" : ""}`} />
                                Auto-Derive from Playoffs
                            </Button>
                        )}
                    </div>
                    {loading
                        ? <p className="text-sm text-muted-foreground">Loading...</p>
                        : (
                            <>
                                {podium.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No placements yet. Auto-derive from playoffs or add manually below.</p>
                                )}
                                {podium.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {[...podium].sort((a, b) => a.place - b.place).map(entry => {
                                            const groupSize = podium.filter(p => p.place === entry.place).length;
                                            const {label, color, Icon} = placeMeta(entry.place, groupSize);
                                            return (
                                                <div key={entry.id} className="panel p-3 flex flex-col gap-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className={`flex items-center gap-1.5 min-w-0 ${color}`}>
                                                            <Icon className="h-4 w-4 shrink-0" />
                                                            <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
                                                        </div>
                                                        <Button size="sm" variant="ghost"
                                                            className="rounded-sm h-6 w-6 p-0 -mr-1 -mt-1 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                            onClick={() => handleDeletePlacement(entry.team_id)} disabled={saving === entry.team_id}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                    <div className="text-sm font-semibold truncate">{entry.teams.name}</div>
                                                    <Badge variant={entry.is_override ? "default" : "secondary"} className="rounded-sm text-[10px] w-fit">
                                                        {entry.is_override ? "Override" : "Auto"}
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="panel p-3 flex items-center gap-2 flex-wrap">
                                    <Select value={String(addPlace)} onValueChange={v => setAddPlace(Number(v))}>
                                        <SelectTrigger className="rounded-sm w-32 text-sm h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                                                <SelectItem key={p} value={String(p)}>{ordinalSuffix(p)} Place</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={addTeamId} onValueChange={setAddTeamId}>
                                        <SelectTrigger className="rounded-sm w-64 text-sm h-8">
                                            <SelectValue placeholder="Select team..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {seasonTeams.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" className="rounded-sm h-8 text-xs gap-1.5"
                                        onClick={handleAddPlacement} disabled={!addTeamId || saving === "add"}
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add
                                    </Button>
                                </div>
                            </>
                        )
                    }
                </div>

                <ChampionGfxBlock seasonId={seasonId} seasonName={season?.name} />

                <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Star className="h-4 w-4" /> Spec Winners
                        </h2>
                    </div>

                    <div className="panel p-3 space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Award Spec</p>
                        <div className="flex gap-2 flex-wrap items-end">
                            <SpecSearchInput key={`spec-${specFormKey}`} specs={specs} selectedSpec={selectedSpec} onSelect={s => handleSelectSpec(s.id)} />
                            <PlayerSearchInput key={`player-${specFormKey}`} seasonId={seasonId} onSelect={setSpecPlayer} />
                            <div className="space-y-1">
                                <Label className="text-xs">Stars</Label>
                                <div className="h-8 flex items-center">
                                    <StarRow value={specStars} max={selectedSpec?.stars} onChange={setSpecStars} disabled={!selectedSpec} />
                                </div>
                            </div>
                            <Button size="sm" className="rounded-sm h-8 gap-1.5"
                                onClick={handleAwardSpec}
                                disabled={savingSpec || !selectedSpecId || !specPlayer}
                            >
                                {savingSpec ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                Award
                            </Button>
                        </div>
                        {specPlayer && (
                            <p className="text-xs text-muted-foreground">
                                Selected: <span className="font-medium text-foreground">{specPlayer.display_name ?? specPlayer.username}</span>
                                {` · @${specPlayer.username}`}
                                {specPlayer.season_team_name ? ` · ${specPlayer.season_team_name}` : " · no team this season"}
                            </p>
                        )}
                    </div>

                    {specWinners.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No spec winners yet.</p>
                    ) : (
                        <div className="panel overflow-x-auto">
                            <table className="table-dense text-sm w-full">
                                <thead>
                                    <tr>
                                        <th className="text-left">Spec</th>
                                        <th className="text-left">Position</th>
                                        <th className="text-left">Stars</th>
                                        <th className="text-left">Player</th>
                                        <th className="w-8"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {specWinners.map(w => (
                                        <tr key={w.id}>
                                            <td className="font-medium">{w.spec.name}</td>
                                            <td className="text-muted-foreground">{w.spec.position}</td>
                                            <td>
                                                <StarRow value={w.stars_awarded} max={w.spec.stars} onChange={n => handleUpdateSpecStars(w, n)} disabled={updatingSpecWinner === w.id} />
                                            </td>
                                            <td className="text-muted-foreground">{w.player.username}</td>
                                            <td>
                                                <Button variant="ghost" size="sm"
                                                    className="rounded-sm h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteSpecWinner(w.id)}
                                                    disabled={deletingSpecWinner === w.id}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Award className="h-4 w-4" /> Awards
                        </h2>
                        <Button variant="outline" size="sm" className="rounded-sm gap-2 text-xs"
                            onClick={handleFetchRoster} disabled={fetchingRoster || loading}
                        >
                            <RefreshCw className={`h-3 w-3 ${fetchingRoster ? "animate-spin" : ""}`} />
                            Reset & Re-fetch Roster
                        </Button>
                    </div>

                    {}
                    <div className="panel p-3 space-y-3">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Add Awards</p>
                        <div className="flex gap-2 flex-wrap items-end">
                            <div className="w-40 shrink-0 space-y-1">
                                <Label className="text-xs">Award Name</Label>
                                <Input className="rounded-sm h-8 text-sm" placeholder="e.g. MVP"
                                    value={draftName}
                                    onChange={e => setDraftName(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") handleAddToDraft(); }}
                                />
                            </div>
                            <div className="min-w-40 space-y-1">
                                <Label className="text-xs">Category</Label>
                                <Select value={draftCategory} onValueChange={v => setDraftCategory(v as AwardCategory)}>
                                    <SelectTrigger className="rounded-sm h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_ORDER.filter(c => c !== "champion_roster").map(cat => (
                                            <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <PlayerSearchInput key={draftKey} seasonId={seasonId} onSelect={setDraftPlayer} />
                            <Button size="sm" variant="outline" className="rounded-sm h-8 gap-1.5"
                                onClick={handleAddToDraft}
                                disabled={!draftName.trim() || !draftPlayer}
                            >
                                <Plus className="h-3.5 w-3.5" /> Add to batch
                            </Button>
                        </div>
                        {draftPlayer && (
                            <p className="text-xs text-muted-foreground">
                                Selected: <span className="font-medium text-foreground">{draftPlayer.display_name ?? draftPlayer.username}</span>
                                {` · @${draftPlayer.username}`}
                                {draftPlayer.season_team_name
                                    ? ` · ${draftPlayer.season_team_name}`
                                    : " · no team this season"}
                            </p>
                        )}
                        {draftAwards.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                                {draftAwards.map(d => (
                                    <div key={d.tempId} className="flex items-center gap-2 text-sm rounded-sm bg-muted/40 px-2 py-1.5">
                                        <span className="font-medium truncate">{d.awardName}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">{CATEGORY_LABELS[d.category]}</span>
                                        <span className="text-muted-foreground truncate flex-1">@{d.player.username}</span>
                                        <Button variant="ghost" size="sm"
                                            className="rounded-sm h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                            onClick={() => handleRemoveDraft(d.tempId)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                <Button size="sm" className="rounded-sm h-8 gap-1.5 mt-1"
                                    onClick={handleSaveBatch} disabled={savingBatch}
                                >
                                    {savingBatch ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                    Save {draftAwards.length} award{draftAwards.length === 1 ? "" : "s"}
                                </Button>
                            </div>
                        )}
                    </div>

                    {!loading && awards.length === 0 && (
                        <p className="text-sm text-muted-foreground">No awards yet.</p>
                    )}

                    {!loading && awards.length > 0 && (
                        <div className="space-y-4">
                            {CATEGORY_ORDER.map(cat => {
                                const group = groupedAwards[cat];
                                if (group.length === 0) return null;
                                const manageable = cat !== "champion_roster";
                                return (
                                    <div key={cat}>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                                            {CATEGORY_LABELS[cat]}
                                        </p>
                                        {cat === "first_team" ? (
                                            <div className="grid grid-cols-7 gap-2">
                                                {group.map((a, i) => (
                                                    <div key={a.id} className="flex flex-col items-center gap-1 relative group/card">
                                                        <div className="relative w-full aspect-[3/4] rounded-sm overflow-hidden bg-primary/10">
                                                            {a.full_avatar_url ? (
                                                                <Image
                                                                    src={a.full_avatar_url}
                                                                    alt={a.players.username}
                                                                    fill
                                                                    className="object-cover object-top"
                                                                    sizes="14vw"
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                                <Button variant="ghost" size="sm"
                                                                    className="h-7 w-7 p-0 text-white hover:bg-white/20 rounded-sm"
                                                                    onClick={() => handlePreviewForRefresh(a)}
                                                                    disabled={previewLoading === a.id}
                                                                >
                                                                    {previewLoading === a.id
                                                                        ? <RefreshCw className="h-3 w-3 animate-spin" />
                                                                        : <ImageIcon className="h-3 w-3" />}
                                                                </Button>
                                                                <Button variant="ghost" size="sm"
                                                                    className="h-7 w-7 p-0 text-red-400 hover:bg-white/20 rounded-sm"
                                                                    onClick={() => handleDeleteAward(a.id)}
                                                                    disabled={deletingAward === a.id}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <AwardNameEditor value={a.award_name} onSave={v => handleRenameAward(a.id, v)} />
                                                        <p className="text-[10px] font-medium text-center truncate w-full">{a.players.username}</p>
                                                        <div className="flex items-center gap-0.5">
                                                            <Button variant="ghost" size="sm"
                                                                className="rounded-sm h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                                onClick={() => handleMoveAward(a, "up")}
                                                                disabled={i === 0 || reordering}
                                                                title="Move earlier"
                                                            >
                                                                <ChevronUp className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm"
                                                                className="rounded-sm h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                                onClick={() => handleMoveAward(a, "down")}
                                                                disabled={i === group.length - 1 || reordering}
                                                                title="Move later"
                                                            >
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="panel overflow-x-auto">
                                                <table className="table-dense text-sm w-full">
                                                    <thead>
                                                        <tr>
                                                            {manageable && <th className="w-14">Order</th>}
                                                            <th className="w-12">Avatar</th>
                                                            <th className="text-left">Award</th>
                                                            <th className="text-left">Player</th>
                                                            <th className="w-8"></th>
                                                            <th className="w-8"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.map((a, i) => (
                                                            <tr key={a.id}>
                                                                {manageable && (
                                                                    <td>
                                                                        <div className="flex items-center gap-0.5">
                                                                            <Button variant="ghost" size="sm"
                                                                                className="rounded-sm h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                                                onClick={() => handleMoveAward(a, "up")}
                                                                                disabled={i === 0 || reordering}
                                                                            >
                                                                                <ChevronUp className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                            <Button variant="ghost" size="sm"
                                                                                className="rounded-sm h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                                                onClick={() => handleMoveAward(a, "down")}
                                                                                disabled={i === group.length - 1 || reordering}
                                                                            >
                                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                <td>
                                                                    <AwardAvatarCell url={a.full_avatar_url} />
                                                                </td>
                                                                <td className={manageable ? "min-w-40" : "font-medium"}>
                                                                    {manageable
                                                                        ? <AwardNameEditor value={a.award_name} onSave={v => handleRenameAward(a.id, v)} />
                                                                        : a.award_name}
                                                                </td>
                                                                <td className="text-muted-foreground">{a.players.username}</td>
                                                                <td>
                                                                    <Button variant="ghost" size="sm"
                                                                        className="rounded-sm h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                                        onClick={() => handlePreviewForRefresh(a)}
                                                                        disabled={previewLoading === a.id}
                                                                        title="Refresh Avatar"
                                                                    >
                                                                        {previewLoading === a.id
                                                                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                                            : <ImageIcon className="h-3.5 w-3.5" />
                                                                        }
                                                                    </Button>
                                                                </td>
                                                                <td>
                                                                    <Button variant="ghost" size="sm"
                                                                        className="rounded-sm h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        onClick={() => handleDeleteAward(a.id)}
                                                                        disabled={deletingAward === a.id}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>
            </div>

            {previewDialog && (
                <AvatarPreviewDialog
                    open={true}
                    onOpenChange={open => { if (!open) setPreviewDialog(null); }}
                    playerName={previewDialog.playerName}
                    cdnUrl={previewDialog.cdnUrl}
                    confirmLabel="Confirm & Replace"
                    onConfirm={handleConfirm}
                    confirming={confirming}
                />
            )}
        </div>
    );
}
