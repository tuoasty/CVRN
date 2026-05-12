"use client";

import React, {useState, useEffect, useCallback, useRef} from "react";
import {Trophy, Medal, Award, Plus, Trash2, RefreshCw, Search} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/app/components/ui/dialog";
import {Button} from "@/app/components/ui/button";
import {Badge} from "@/app/components/ui/badge";
import {Input} from "@/app/components/ui/input";
import {Label} from "@/app/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/app/components/ui/select";
import {SeasonWithPlayoffConfig, SeasonPodiumEntryWithTeam, SeasonAwardEntryWithPlayer} from "@/server/domains/season";
import {PlayerWithTeamInfo} from "@/server/domains/player";
import {
    getSeasonPodiumAction,
    getSeasonAwardsAction,
    deriveAndSaveSeasonPodiumAction,
    upsertSeasonPodiumSlotAction,
    deleteSeasonPodiumSlotAction,
    upsertSeasonAwardAction,
    deleteSeasonAwardAction,
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

interface SeasonResultsDialogProps {
    season: SeasonWithPlayoffConfig | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SeasonResultsDialog({season, open, onOpenChange}: SeasonResultsDialogProps) {
    const {teams: seasonTeams} = useTeamsBySeason(open ? season?.id ?? null : null);
    const [podium, setPodium] = useState<SeasonPodiumEntryWithTeam[]>([]);
    const [awards, setAwards] = useState<SeasonAwardEntryWithPlayer[]>([]);
    const [loading, setLoading] = useState(false);
    const [deriving, setDeriving] = useState(false);
    const [saving, setSaving] = useState<number | null>(null);
    const [deletingAward, setDeletingAward] = useState<string | null>(null);
    const [newAwardName, setNewAwardName] = useState("");
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithTeamInfo | null>(null);
    const [addingAward, setAddingAward] = useState(false);

    const load = useCallback(async () => {
        if (!season) return;
        setLoading(true);
        try {
            const [pRes, aRes] = await Promise.all([
                getSeasonPodiumAction({seasonId: season.id}),
                getSeasonAwardsAction({seasonId: season.id}),
            ]);
            if (pRes.ok) setPodium(pRes.value);
            if (aRes.ok) setAwards(aRes.value);
        } finally {
            setLoading(false);
        }
    }, [season]);

    useEffect(() => { if (open) load(); }, [open, load]);

    const handleDerive = async () => {
        if (!season) return;
        setDeriving(true);
        try {
            const result = await deriveAndSaveSeasonPodiumAction({seasonId: season.id});
            if (!result.ok) { toast.error("Could not auto-derive podium", result.error.message); return; }
            toast.success(result.value.skipped
                ? "Podium already set — clear slots first to re-derive"
                : "Podium derived from playoffs"
            );
            await load();
        } catch (err) {
            clientLogger.error("SeasonResultsDialog", "Error deriving podium", {err});
            toast.error("Something went wrong");
        } finally {
            setDeriving(false);
        }
    };

    const handleSaveSlot = async (place: 1 | 2 | 3, teamId: string) => {
        if (!season || !teamId) return;
        setSaving(place);
        try {
            const result = await upsertSeasonPodiumSlotAction({seasonId: season.id, place, teamId, isOverride: true});
            if (!result.ok) { toast.error("Failed to save slot", result.error.message); return; }
            toast.success(`${PLACE_META[place].label} saved`);
            await load();
        } finally { setSaving(null); }
    };

    const handleDeleteSlot = async (place: 1 | 2 | 3) => {
        if (!season) return;
        setSaving(place);
        try {
            const result = await deleteSeasonPodiumSlotAction({seasonId: season.id, place});
            if (!result.ok) { toast.error("Failed to clear slot", result.error.message); return; }
            await load();
        } finally { setSaving(null); }
    };

    const handleAddAward = async () => {
        if (!season || !newAwardName.trim() || !selectedPlayer) return;
        setAddingAward(true);
        try {
            const result = await upsertSeasonAwardAction({
                seasonId: season.id,
                playerId: selectedPlayer.id,
                awardName: newAwardName.trim(),
            });
            if (!result.ok) { toast.error("Failed to add award", result.error.message); return; }
            toast.success("Award added");
            setNewAwardName("");
            setSelectedPlayer(null);
            await load();
        } finally { setAddingAward(false); }
    };

    const handleDeleteAward = async (awardId: string) => {
        setDeletingAward(awardId);
        try {
            const result = await deleteSeasonAwardAction({awardId});
            if (!result.ok) { toast.error("Failed to delete award", result.error.message); return; }
            await load();
        } finally { setDeletingAward(null); }
    };

    if (!season) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-sm max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold uppercase tracking-wider">
                        Season Results — {season.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Podium</h3>
                        {!!season.end_date && (
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

                <div className="space-y-3 pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Award className="h-4 w-4" /> Awards
                    </h3>

                    {awards.length > 0 && (
                        <div className="panel overflow-x-auto">
                            <table className="table-dense text-sm w-full">
                                <thead><tr><th className="text-left">Award</th><th className="text-left">Player</th><th className="w-10"></th></tr></thead>
                                <tbody>
                                    {awards.map(a => (
                                        <tr key={a.id}>
                                            <td className="font-medium">{a.award_name}</td>
                                            <td className="text-muted-foreground">{a.players.username}</td>
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
                    {awards.length === 0 && !loading && (
                        <p className="text-sm text-muted-foreground">No awards yet.</p>
                    )}

                    <div className="panel p-3 space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Add Award</p>
                        <div className="flex gap-2 flex-wrap items-end">
                            <div className="flex-1 min-w-32 space-y-1">
                                <Label className="text-xs">Award Name</Label>
                                <Input className="rounded-sm h-8 text-sm" placeholder="e.g. Best Spiker"
                                    value={newAwardName} onChange={e => setNewAwardName(e.target.value)} />
                            </div>
                            <PlayerSearchInput onSelect={setSelectedPlayer} />
                            <Button size="sm" className="rounded-sm h-8 gap-1.5"
                                onClick={handleAddAward}
                                disabled={addingAward || !newAwardName.trim() || !selectedPlayer}
                            >
                                <Plus className="h-3.5 w-3.5" /> Add
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
            </DialogContent>
        </Dialog>
    );
}
