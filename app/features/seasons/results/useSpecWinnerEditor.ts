"use client";

import {useCallback, useState, type Dispatch, type SetStateAction} from "react";
import {awardSpecWinnerAction, deleteSpecWinnerAction} from "@/app/actions/spec.actions";
import {PlayerWithTeamInfo} from "@/server/domains/player";
import {SpecWinnerWithRefs} from "@/server/domains/spec";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";

interface Options {
    seasonId: string;
    winners: SpecWinnerWithRefs[];
    setWinners: Dispatch<SetStateAction<SpecWinnerWithRefs[]>>;
    onRemoved: (winnerId: string) => void;
}

export function useSpecWinnerEditor({seasonId, winners, setWinners, onRemoved}: Options) {
    const [busyId, setBusyId] = useState<string | null>(null);

    const save = useCallback(async (winner: SpecWinnerWithRefs, patch: {stars?: number; player?: PlayerWithTeamInfo}) => {
        const stars = patch.stars ?? winner.stars_awarded;
        const player = patch.player;
        const previous = winners;
        setBusyId(winner.id);
        setWinners(prev => prev.map(w => w.id !== winner.id ? w : {
            ...w,
            stars_awarded: stars,
            ...(player ? {
                player_id: player.id,
                player: {id: player.id, username: player.username ?? player.id, display_name: player.display_name, avatar_url: player.avatar_url},
            } : {}),
        }));
        try {
            const result = await awardSpecWinnerAction({seasonId, specId: winner.spec_id, playerId: player?.id ?? winner.player_id, starsAwarded: stars});
            if (!result.ok) {
                setWinners(previous);
                toast.error(player ? "Failed to change winner" : "Failed to update stars", result.error.message);
                return;
            }
            setWinners(prev => prev.map(w => (w.id === winner.id || w.spec_id === result.value.spec_id ? result.value : w)));
            if (player) toast.success(`${winner.spec.name} moved to @${player.username}`);
        } catch (err) {
            setWinners(previous);
            clientLogger.error("useSpecWinnerEditor", "Spec winner update failed", {err});
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    }, [seasonId, winners, setWinners]);

    const setStars = useCallback((winner: SpecWinnerWithRefs, stars: number) => {
        if (stars === winner.stars_awarded) return;
        return save(winner, {stars});
    }, [save]);

    const changePlayer = useCallback((winner: SpecWinnerWithRefs, player: PlayerWithTeamInfo) => {
        if (player.id === winner.player_id) return;
        return save(winner, {player});
    }, [save]);

    const remove = useCallback(async (winner: SpecWinnerWithRefs) => {
        setBusyId(winner.id);
        try {
            const result = await deleteSpecWinnerAction({id: winner.id});
            if (!result.ok) { toast.error("Failed to remove spec winner", result.error.message); return; }
            setWinners(prev => prev.filter(w => w.id !== winner.id));
            onRemoved(winner.id);
            toast.success(`Removed ${winner.spec.name} · @${winner.player.username}`);
        } catch (err) {
            clientLogger.error("useSpecWinnerEditor", "Spec winner remove failed", {err});
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    }, [setWinners, onRemoved]);

    return {busyId, setStars, changePlayer, remove};
}

export type SpecWinnerEditor = ReturnType<typeof useSpecWinnerEditor>;
