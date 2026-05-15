"use client";

import React, {useState, useEffect, useCallback, useRef} from "react";
import Image from "next/image";
import Link from "next/link";
import {useParams} from "next/navigation";
import {Trophy, Medal, Award, Plus, Trash2, RefreshCw, Search, ImageIcon, ChevronLeft} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from "@/app/components/ui/dialog";
import {Button} from "@/app/components/ui/button";
import {Badge} from "@/app/components/ui/badge";
import {Input} from "@/app/components/ui/input";
import {Label} from "@/app/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/app/components/ui/select";
import {SeasonPodiumEntryWithTeam, SeasonAwardEntryWithPlayer, AwardCategory} from "@/server/domains/season";
import {PlayerWithTeamInfo} from "@/server/domains/player";
import {Season} from "@/shared/types/db";
import {
    getSeasonByIdAction,
    getSeasonPodiumAction,
    getSeasonAwardsAction,
    deriveAndSaveSeasonPodiumAction,
    upsertSeasonPodiumSlotAction,
    deleteSeasonPodiumSlotAction,
    upsertSeasonAwardAction,
    deleteSeasonAwardAction,
    previewAwardAvatarAction,
    saveAwardAvatarAction,
    fetchChampionRosterAwardsAction,
} from "@/app/actions/season.actions";
import {searchPlayersInDatabaseAction} from "@/app/actions/player.actions";
import {useTeamsBySeason} from "@/app/hooks/useTeams";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";

const PLACE_META = {
    1: {label: "Champion",  color: "text-yellow-500", Icon: Trophy},
    2: {label: "Runner-Up", color: "text-slate-400",  Icon: Medal},
    3: {label: "3rd Place", color: "text-amber-700",  Icon: Medal},
} as const;

const CATEGORY_LABELS: Record<AwardCategory, string> = {
    individual_winners: "Individual Awards",
    first_team: "First Team",
    staff_team: "Staff Team",
    champion_roster: "Champion Roster",
};

const CATEGORY_ORDER: AwardCategory[] = ["individual_winners", "first_team", "staff_team", "champion_roster"];

function PodiumSlot({place, slot, seasonTeams, saving, onSave, onDelete}: {
    place: 1 | 2 | 3;
    slot: SeasonPodiumEntryWithTeam | undefined;
    seasonTeams: {id: string; name: string}[];
    saving: number | null;
    onSave: (place: 1 | 2 | 3, teamId: string) => void;
    onDelete: (place: 1 | 2 | 3) => void;
}) {
    const {label, color, Icon} = PLACE_META[place];
    const [selectedTeamId, setSelectedTeamId] = useState(slot?.team_id ?? "");
    useEffect(() => { setSelectedTeamId(slot?.team_id ?? ""); }, [slot?.team_id]);

    return (
        <div className="panel p-3 flex items-center gap-3">
            <div className={`flex items-center gap-1.5 w-28 shrink-0 ${color}`}>
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{label}</span>
            </div>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId} disabled={saving === place}>
                <SelectTrigger className="rounded-sm flex-1 text-sm h-8">
                    <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                    {seasonTeams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {slot && (
                <Badge variant={slot.is_override ? "default" : "secondary"} className="rounded-sm text-xs shrink-0">
                    {slot.is_override ? "Override" : "Auto"}
                </Badge>
            )}
            <Button size="sm" className="rounded-sm h-8 text-xs shrink-0"
                onClick={() => onSave(place, selectedTeamId)}
                disabled={!selectedTeamId || saving === place}
            >Save</Button>
            {slot && (
                <Button size="sm" variant="ghost"
                    className="rounded-sm h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => onDelete(place)} disabled={saving === place}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            )}
        </div>
    );
}

function PlayerSearchInput({onSelect}: {onSelect: (player: PlayerWithTeamInfo) => void}) {
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
                const res = await searchPlayersInDatabaseAction({query: q.trim()});
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
        <div className="relative flex-1 min-w-48">
            <Label className="text-xs">Player</Label>
            <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    className="rounded-sm h-8 text-sm pl-7"
                    placeholder="Search username..."
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
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center justify-between gap-2"
                            onClick={() => handleSelect(p)}
                        >
                            <span className="font-medium">{p.username}</span>
                            {p.current_team_name && (
                                <span className="text-xs text-muted-foreground">{p.current_team_name}</span>
                            )}
                        </button>
                    ))}
                </div>
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
            <Image src={url} alt="avatar" fill className="object-cover object-top" sizes="32px" />
        </div>
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
    const [saving, setSaving] = useState<number | null>(null);
    const [deletingAward, setDeletingAward] = useState<string | null>(null);

    const [newAwardName, setNewAwardName] = useState("");
    const [newCategory, setNewCategory] = useState<AwardCategory>("individual_winners");
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithTeamInfo | null>(null);
    const [previewLoading, setPreviewLoading] = useState<string | null>(null);

    const [previewDialog, setPreviewDialog] = useState<{
        mode: "create" | "refresh";
        playerName: string;
        cdnUrl: string;
        awardId?: string;
    } | null>(null);
    const [confirming, setConfirming] = useState(false);

    const {teams: seasonTeams} = useTeamsBySeason(seasonId);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [sRes, pRes, aRes] = await Promise.all([
                getSeasonByIdAction({seasonId}),
                getSeasonPodiumAction({seasonId}),
                getSeasonAwardsAction({seasonId}),
            ]);
            if (sRes.ok) setSeason(sRes.value);
            if (pRes.ok) setPodium(pRes.value);
            if (aRes.ok) setAwards(aRes.value);
        } finally {
            setLoading(false);
        }
    }, [seasonId]);

    useEffect(() => { load(); }, [load]);

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

    const handleSaveSlot = async (place: 1 | 2 | 3, teamId: string) => {
        if (!teamId) return;
        setSaving(place);
        try {
            const result = await upsertSeasonPodiumSlotAction({seasonId, place, teamId, isOverride: true});
            if (!result.ok) { toast.error("Failed to save slot", result.error.message); return; }
            toast.success(`${PLACE_META[place].label} saved`);
            await load();
        } finally { setSaving(null); }
    };

    const handleDeleteSlot = async (place: 1 | 2 | 3) => {
        setSaving(place);
        try {
            const result = await deleteSeasonPodiumSlotAction({seasonId, place});
            if (!result.ok) { toast.error("Failed to clear slot", result.error.message); return; }
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
            await load();
        } catch (err) {
            clientLogger.error("SeasonResultsPage", "Error fetching champion roster", {err});
            toast.error("Something went wrong");
        } finally {
            setFetchingRoster(false);
        }
    };

    const handlePreviewForCreate = async () => {
        if (!newAwardName.trim() || !selectedPlayer) return;
        setPreviewLoading("create");
        try {
            const res = await previewAwardAvatarAction({playerId: selectedPlayer.id});
            if (!res.ok) { toast.error("Could not fetch avatar", res.error.message); return; }
            setPreviewDialog({mode: "create", playerName: selectedPlayer.username ?? selectedPlayer.id, cdnUrl: res.value.cdnUrl});
        } finally {
            setPreviewLoading(null);
        }
    };

    const handlePreviewForRefresh = async (award: SeasonAwardEntryWithPlayer) => {
        setPreviewLoading(award.id);
        try {
            const res = await previewAwardAvatarAction({playerId: award.players.id});
            if (!res.ok) { toast.error("Could not fetch avatar", res.error.message); return; }
            setPreviewDialog({mode: "refresh", playerName: award.players.username, cdnUrl: res.value.cdnUrl, awardId: award.id});
        } finally {
            setPreviewLoading(null);
        }
    };

    const handleConfirm = async () => {
        if (!previewDialog) return;
        setConfirming(true);
        try {
            if (previewDialog.mode === "create") {
                const result = await upsertSeasonAwardAction({
                    seasonId,
                    playerId: selectedPlayer!.id,
                    awardName: newAwardName.trim(),
                    category: newCategory,
                    cdnUrl: previewDialog.cdnUrl,
                });
                if (!result.ok) { toast.error("Failed to add award", result.error.message); return; }
                toast.success("Award added");
                setNewAwardName("");
                setNewCategory("individual_winners");
                setSelectedPlayer(null);
            } else {
                const result = await saveAwardAvatarAction({awardId: previewDialog.awardId!, cdnUrl: previewDialog.cdnUrl});
                if (!result.ok) { toast.error("Failed to update avatar", result.error.message); return; }
                toast.success("Avatar updated");
            }
            setPreviewDialog(null);
            await load();
        } finally {
            setConfirming(false);
        }
    };

    const handleDeleteAward = async (awardId: string) => {
        setDeletingAward(awardId);
        try {
            const result = await deleteSeasonAwardAction({awardId});
            if (!result.ok) { toast.error("Failed to delete award", result.error.message); return; }
            await load();
        } finally { setDeletingAward(null); }
    };

    const ROSTER_ROLE_RANK: Record<string, number> = {captain: 0, vice_captain: 1, court_captain: 2};
    const groupedAwards = CATEGORY_ORDER.reduce((acc, cat) => {
        const group = awards.filter(a => a.category === cat);
        if (cat === "champion_roster") {
            group.sort((a, b) => (ROSTER_ROLE_RANK[a.award_name] ?? 3) - (ROSTER_ROLE_RANK[b.award_name] ?? 3));
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
                            <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                {loading ? "Loading..." : (season?.name ?? "Season Results")}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Podium and awards management</p>
                        </div>
                    </div>
                </div>

                {/* Podium */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Podium</h2>
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
                        : ([1, 2, 3] as const).map(place => (
                            <PodiumSlot key={place} place={place}
                                slot={podium.find(p => p.place === place)}
                                seasonTeams={seasonTeams}
                                saving={saving}
                                onSave={handleSaveSlot}
                                onDelete={handleDeleteSlot}
                            />
                        ))
                    }
                </div>

                {/* Awards */}
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

                    {!loading && awards.length === 0 && (
                        <p className="text-sm text-muted-foreground">No awards yet.</p>
                    )}

                    {!loading && awards.length > 0 && (
                        <div className="space-y-4">
                            {CATEGORY_ORDER.map(cat => {
                                const group = groupedAwards[cat];
                                if (group.length === 0) return null;
                                return (
                                    <div key={cat}>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                                            {CATEGORY_LABELS[cat]}
                                        </p>
                                        {cat === "first_team" ? (
                                            <div className="grid grid-cols-7 gap-2">
                                                {group.map(a => (
                                                    <div key={a.id} className="flex flex-col items-center gap-1 relative group/card">
                                                        <div className="relative w-full aspect-[3/4] rounded-sm overflow-hidden bg-primary/10">
                                                            {a.full_avatar_url ? (
                                                                <Image
                                                                    src={a.full_avatar_url}
                                                                    alt={a.players.username}
                                                                    fill
                                                                    className="object-cover object-top"
                                                                    sizes="14vw"
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
                                                        <p className="text-[10px] font-medium text-center truncate w-full">{a.players.username}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="panel overflow-x-auto">
                                                <table className="table-dense text-sm w-full">
                                                    <thead>
                                                        <tr>
                                                            <th className="w-12">Avatar</th>
                                                            <th className="text-left">Award</th>
                                                            <th className="text-left">Player</th>
                                                            <th className="w-8"></th>
                                                            <th className="w-8"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.map(a => (
                                                            <tr key={a.id}>
                                                                <td>
                                                                    <AwardAvatarCell url={a.full_avatar_url} />
                                                                </td>
                                                                <td className="font-medium">{a.award_name}</td>
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

                    {/* Add award form */}
                    <div className="panel p-3 space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Add Award</p>
                        <div className="flex gap-2 flex-wrap items-end">
                            <div className="flex-1 min-w-32 space-y-1">
                                <Label className="text-xs">Award Name</Label>
                                <Input className="rounded-sm h-8 text-sm" placeholder="e.g. MVP"
                                    value={newAwardName} onChange={e => setNewAwardName(e.target.value)} />
                            </div>
                            <div className="min-w-40 space-y-1">
                                <Label className="text-xs">Category</Label>
                                <Select value={newCategory} onValueChange={v => setNewCategory(v as AwardCategory)}>
                                    <SelectTrigger className="rounded-sm h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_ORDER.map(cat => (
                                            <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <PlayerSearchInput onSelect={setSelectedPlayer} />
                            <Button size="sm" className="rounded-sm h-8 gap-1.5"
                                onClick={handlePreviewForCreate}
                                disabled={previewLoading === "create" || !newAwardName.trim() || !selectedPlayer}
                            >
                                {previewLoading === "create"
                                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    : <Plus className="h-3.5 w-3.5" />
                                }
                                Add
                            </Button>
                        </div>
                        {selectedPlayer && (
                            <p className="text-xs text-muted-foreground">
                                Selected: <span className="font-medium text-foreground">{selectedPlayer.username}</span>
                                {selectedPlayer.current_team_name && ` · ${selectedPlayer.current_team_name}`}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {previewDialog && (
                <AvatarPreviewDialog
                    open={true}
                    onOpenChange={open => { if (!open) setPreviewDialog(null); }}
                    playerName={previewDialog.playerName}
                    cdnUrl={previewDialog.cdnUrl}
                    confirmLabel={previewDialog.mode === "create" ? "Confirm & Save" : "Confirm & Replace"}
                    onConfirm={handleConfirm}
                    confirming={confirming}
                />
            )}
        </div>
    );
}
