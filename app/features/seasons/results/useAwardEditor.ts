"use client";

import {useCallback, useState, type Dispatch, type SetStateAction} from "react";
import {
    deleteSeasonAwardAction,
    previewAwardAvatarAction,
    reorderSeasonAwardsAction,
    saveAwardAvatarAction,
    setAllStarCaptainAction,
    updateSeasonAwardAction,
} from "@/app/actions/season.actions";
import {PlayerWithTeamInfo} from "@/server/domains/player";
import {SeasonAwardEntryWithPlayer} from "@/server/domains/season";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";
import {reorderGroup} from "./awardGroups";

export type EditBusy = "apply" | "captain" | "move" | "remove" | null;

interface Options {
    awards: SeasonAwardEntryWithPlayer[];
    setAwards: Dispatch<SetStateAction<SeasonAwardEntryWithPlayer[]>>;
    refreshAwards: () => Promise<void>;
    onRemoved: () => void;
}

export function useAwardEditor({awards, setAwards, refreshAwards, onRemoved}: Options) {
    const [busy, setBusy] = useState<EditBusy>(null);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);

    const run = useCallback(async (kind: Exclude<EditBusy, null>, task: () => Promise<void>) => {
        setBusy(kind);
        try {
            await task();
        } catch (err) {
            clientLogger.error("useAwardEditor", `Award ${kind} failed`, {err});
            toast.error("Something went wrong");
        } finally {
            setBusy(null);
        }
    }, []);

    const apply = useCallback((award: SeasonAwardEntryWithPlayer, awardName: string, player?: PlayerWithTeamInfo) => run("apply", async () => {
        const name = awardName.trim();
        if (!name) { toast.error("Award name is required"); return; }
        const playerChanged = player && player.id !== award.player_id;
        if (name === award.award_name && !playerChanged) return;
        const previous = awards;
        setAwards(prev => prev.map(a => a.id !== award.id ? a : {
            ...a,
            award_name: name,
            ...(playerChanged ? {
                player_id: player.id,
                players: {id: player.id, username: player.username ?? player.id, season_team_name: player.season_team_name ?? null},
            } : {}),
        }));
        const result = await updateSeasonAwardAction({awardId: award.id, awardName: name, ...(playerChanged ? {playerId: player.id} : {})});
        if (!result.ok) {
            setAwards(previous);
            toast.error("Failed to update award", result.error.message);
            return;
        }
        if (playerChanged) await refreshAwards();
        toast.success(playerChanged ? `Award moved to @${player.username}` : "Award renamed");
    }), [awards, setAwards, refreshAwards, run]);

    const toggleCaptain = useCallback((award: SeasonAwardEntryWithPlayer) => run("captain", async () => {
        const isCaptain = !award.all_star_captain;
        const result = await setAllStarCaptainAction({awardId: award.id, isCaptain});
        if (!result.ok) { toast.error("Failed to update captain", result.error.message); return; }
        setAwards(prev => prev.map(a => {
            if (a.id === award.id) return {...a, all_star_captain: isCaptain};
            if (isCaptain && a.category === "all_star" && a.all_star_team === award.all_star_team) return {...a, all_star_captain: false};
            return a;
        }));
    }), [setAwards, run]);

    const refreshAvatar = useCallback(async (award: SeasonAwardEntryWithPlayer) => {
        setRefreshingId(award.id);
        try {
            const preview = await previewAwardAvatarAction({playerId: award.players.id});
            if (!preview.ok) { toast.error("Could not fetch avatar", preview.error.message); return; }
            const saved = await saveAwardAvatarAction({awardId: award.id, cdnUrl: preview.value.cdnUrl});
            if (!saved.ok) { toast.error("Failed to update avatar", saved.error.message); return; }
            await refreshAwards();
            toast.success(`Avatar updated for @${award.players.username}`);
        } catch (err) {
            clientLogger.error("useAwardEditor", "Avatar refresh failed", {err});
            toast.error("Something went wrong");
        } finally {
            setRefreshingId(null);
        }
    }, [refreshAwards]);

    const move = useCallback((award: SeasonAwardEntryWithPlayer, direction: "up" | "down") => run("move", async () => {
        const updates = reorderGroup(awards, award, direction);
        if (!updates) return;
        const previous = awards;
        const orderById = new Map(updates.map(u => [u.id, u.sortOrder]));
        setAwards(prev => prev.map(a => orderById.has(a.id) ? {...a, sort_order: orderById.get(a.id)!} : a));
        const result = await reorderSeasonAwardsAction({updates});
        if (!result.ok) {
            setAwards(previous);
            toast.error("Failed to reorder", result.error.message);
        }
    }), [awards, setAwards, run]);

    const remove = useCallback((award: SeasonAwardEntryWithPlayer) => run("remove", async () => {
        const result = await deleteSeasonAwardAction({awardId: award.id});
        if (!result.ok) { toast.error("Failed to remove award", result.error.message); return; }
        setAwards(prev => prev.filter(a => a.id !== award.id));
        onRemoved();
        toast.success(`Removed ${award.award_name} · @${award.players.username}`);
    }), [setAwards, onRemoved, run]);

    return {
        busy,
        apply,
        toggleCaptain,
        refreshAvatar,
        refreshingId,
        move,
        remove,
    };
}

export type AwardEditor = ReturnType<typeof useAwardEditor>;
