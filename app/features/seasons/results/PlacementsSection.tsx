"use client";

import {useState, type Dispatch, type SetStateAction} from "react";
import {Loader2, X} from "lucide-react";
import {Button} from "@/app/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/app/components/ui/select";
import {
    deleteSeasonPodiumSlotAction,
    deriveAndSaveSeasonPodiumAction,
    getSeasonPodiumAction,
    upsertSeasonPodiumSlotAction,
} from "@/app/actions/season.actions";
import {useTeamsBySeason} from "@/app/hooks/useTeams";
import {SeasonPodiumEntryWithTeam} from "@/server/domains/season";
import {formatPlacement, ordinalSuffix} from "@/app/utils/placement";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";
import {EmptyRows, SectionHeader, TextAction} from "./ResultsUi";

const PLACES = [1, 2, 3, 4, 5, 6, 7, 8];
const ROW = "grid h-8 grid-cols-[48px_minmax(0,1fr)_auto_24px] items-center gap-2 border-b border-border px-1 text-sm";

interface Props {
    seasonId: string;
    podium: SeasonPodiumEntryWithTeam[];
    setPodium: Dispatch<SetStateAction<SeasonPodiumEntryWithTeam[]>>;
}

export function PlacementsSection({seasonId, podium, setPodium}: Props) {
    const {teams} = useTeamsBySeason(seasonId);
    const [deriving, setDeriving] = useState(false);
    const [adding, setAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState<string | null>(null);
    const [place, setPlace] = useState(1);
    const [teamId, setTeamId] = useState("");

    const sorted = [...podium].sort((a, b) => a.place - b.place);

    const refresh = async () => {
        const res = await getSeasonPodiumAction({seasonId});
        if (res.ok) setPodium(res.value);
    };

    const derive = async () => {
        setDeriving(true);
        try {
            const result = await deriveAndSaveSeasonPodiumAction({seasonId});
            if (!result.ok) { toast.error("Could not auto-derive placements", result.error.message); return; }
            if (result.value.skipped) {
                toast.info("Placements already set. Remove them first to re-derive.");
                return;
            }
            await refresh();
            toast.success("Placements derived from playoffs");
        } catch (err) {
            clientLogger.error("PlacementsSection", "Derive failed", {err});
            toast.error("Something went wrong");
        } finally {
            setDeriving(false);
        }
    };

    const add = async () => {
        if (!teamId) return;
        setSaving(true);
        try {
            const result = await upsertSeasonPodiumSlotAction({seasonId, place, teamId, isOverride: true});
            if (!result.ok) { toast.error("Failed to save placement", result.error.message); return; }
            await refresh();
            toast.success(`${ordinalSuffix(place)} place saved`);
            setTeamId("");
        } catch (err) {
            clientLogger.error("PlacementsSection", "Add placement failed", {err});
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (entry: SeasonPodiumEntryWithTeam) => {
        setRemoving(entry.team_id);
        try {
            const result = await deleteSeasonPodiumSlotAction({seasonId, teamId: entry.team_id});
            if (!result.ok) { toast.error("Failed to remove placement", result.error.message); return; }
            setPodium(prev => prev.filter(p => p.team_id !== entry.team_id));
        } finally {
            setRemoving(null);
        }
    };

    return (
        <section>
            <SectionHeader title="Placements">
                <TextAction disabled={deriving} onClick={derive}>
                    {deriving && <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />}
                    Auto-derive
                </TextAction>
            </SectionHeader>
            {sorted.length === 0 && !adding && <EmptyRows>No placements yet</EmptyRows>}
            {sorted.map(entry => {
                const groupSize = podium.filter(p => p.place === entry.place).length;
                return (
                    <div key={entry.id} className={ROW}>
                        <span className="font-mono text-xs tabular-nums">{formatPlacement(entry.place, groupSize)}</span>
                        <span className="truncate">{entry.teams.name}</span>
                        <span className="text-xs text-muted-foreground">{entry.is_override ? "override" : "auto"}</span>
                        <button
                            type="button"
                            aria-label={`Remove ${entry.teams.name} from placements`}
                            disabled={removing === entry.team_id}
                            onClick={() => remove(entry)}
                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-destructive focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 motion-reduce:transition-none"
                        >
                            {removing === entry.team_id
                                ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                                : <X className="size-3.5" />}
                        </button>
                    </div>
                );
            })}
            {adding ? (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Select value={String(place)} onValueChange={v => setPlace(Number(v))}>
                        <SelectTrigger size="sm" className="w-20 rounded-md font-mono tabular-nums" aria-label="Place">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PLACES.map(p => (
                                <SelectItem key={p} value={String(p)} className="font-mono tabular-nums">{ordinalSuffix(p)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={teamId} onValueChange={setTeamId}>
                        <SelectTrigger size="sm" className="min-w-0 flex-1 rounded-md" aria-label="Team">
                            <SelectValue placeholder="Team" />
                        </SelectTrigger>
                        <SelectContent>
                            {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button size="sm" className="rounded-md" disabled={!teamId || saving} onClick={add}>
                        {saving && <Loader2 className="animate-spin motion-reduce:animate-none" />}
                        Add
                    </Button>
                    <TextAction tone="quiet" onClick={() => { setAdding(false); setTeamId(""); }}>Cancel</TextAction>
                </div>
            ) : (
                <div className="flex h-8 items-center px-1">
                    <TextAction onClick={() => setAdding(true)}>+ Add team</TextAction>
                </div>
            )}
        </section>
    );
}
