"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { useTeamsBySeason } from "@/app/hooks/useTeams";
import { useStandings } from "@/app/hooks/useStandings";
import { RotateCcw } from "lucide-react";

type SeedChooserDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    seasonId: string;
    regionId: string;
    totalTeams: number;
    onConfirm: (seedOrder: string[]) => void;
};

export function SeedChooserDialog({
    open,
    onOpenChange,
    seasonId,
    regionId,
    totalTeams,
    onConfirm,
}: SeedChooserDialogProps) {
    const { teams } = useTeamsBySeason(seasonId);
    const { standings } = useStandings(seasonId, regionId || undefined);

    const sortedTeams = useMemo(
        () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
        [teams]
    );

    const rankByTeamId = useMemo(() => {
        const map = new Map<string, number>();
        for (const s of standings) {
            if (s.team_id && s.rank != null) map.set(s.team_id, s.rank);
        }
        return map;
    }, [standings]);

    const defaultOrder = useMemo<(string | null)[]>(() => {
        const ranked = [...standings].sort(
            (a, b) => (a.rank ?? 9999) - (b.rank ?? 9999)
        );
        return Array.from({ length: totalTeams }, (_, k) => ranked[k]?.team_id ?? null);
    }, [standings, totalTeams]);

    const [slots, setSlots] = useState<(string | null)[]>([]);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!open) {
            initializedRef.current = false;
            return;
        }
        if (initializedRef.current) return;
        if (teams.length === 0) return;
        setSlots(defaultOrder);
        initializedRef.current = true;
    }, [open, teams, defaultOrder]);

    const handlePick = (slotIndex: number, teamId: string) => {
        setSlots((prev) => {
            const next = [...prev];
            const existing = next.findIndex((id, i) => id === teamId && i !== slotIndex);
            if (existing !== -1) {
                next[existing] = next[slotIndex];
            }
            next[slotIndex] = teamId;
            return next;
        });
    };

    const resetToStandings = () => setSlots(defaultOrder);

    const filledCount = slots.filter((s) => s !== null).length;
    const canConfirm =
        slots.length === totalTeams &&
        filledCount === totalTeams &&
        new Set(slots).size === totalTeams;

    const teamName = (id: string | null) =>
        id ? teams.find((t) => t.id === id)?.name ?? "Unknown team" : undefined;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-sm max-w-lg">
                <DialogHeader>
                    <DialogTitle>Custom Seeding</DialogTitle>
                    <DialogDescription>
                        Assign a team to each seed. Defaults to standings order. Picking a team
                        already placed elsewhere swaps the two slots.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-2">
                    {Array.from({ length: totalTeams }, (_, k) => {
                        const current = slots[k] ?? null;
                        const rank = current ? rankByTeamId.get(current) : undefined;
                        return (
                            <div key={k} className="flex items-center gap-3">
                                <span className="w-16 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                                    Seed #{k + 1}
                                </span>
                                <Select
                                    value={current ?? undefined}
                                    onValueChange={(value) => handlePick(k, value)}
                                >
                                    <SelectTrigger className="flex-1 rounded-sm">
                                        <SelectValue placeholder="Select team…">
                                            {current ? (
                                                <span>
                                                    {teamName(current)}
                                                    {rank != null && (
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            (rank {rank})
                                                        </span>
                                                    )}
                                                </span>
                                            ) : undefined}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortedTeams.map((team) => (
                                            <SelectItem key={team.id} value={team.id}>
                                                {team.name}
                                                {rankByTeamId.get(team.id) != null && (
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        (rank {rankByTeamId.get(team.id)})
                                                    </span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        );
                    })}
                </div>

                <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={resetToStandings}
                        className="rounded-sm"
                    >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset to standings
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            {filledCount} / {totalTeams} filled
                        </span>
                        <Button
                            type="button"
                            disabled={!canConfirm}
                            onClick={() => onConfirm(slots as string[])}
                            className="rounded-sm bg-primary hover:bg-primary/90"
                        >
                            Use these seeds
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
