"use client";

import { create } from "zustand";
import { Player } from "@/shared/types/db";
import {
    savePlayerToTeamAction,
    removePlayerFromTeamAction,
    getTeamPlayersAction,
} from "@/app/actions/player.actions";
import { shouldRefetch } from "@/app/stores/storeUtils";

interface PlayersState {
    playersById: Map<string, Player>;
    playerIdsByTeam: Map<string, string[]>;
    isLoading: boolean;
    error: string | null;
    lastFetchedByTeam: Map<string, number>;

    fetchPlayersForTeam: (teamId: string, options?: { force?: boolean }) => Promise<void>;
    setPlayersForTeam: (teamId: string, players: Player[]) => void;
    addPlayerToTeam: (
        teamId: string,
        robloxUserId: string,
        username: string,
        displayName?: string | null,
        avatarUrl?: string | null
    ) => Promise<{ ok: boolean; error?: string; player?: Player }>;
    removePlayerFromTeam: (
        robloxUserId: string,
        teamId: string
    ) => Promise<{ ok: boolean; error?: string }>;
    getPlayersByTeam: (teamId: string) => Player[];
    getPlayerById: (playerId: string) => Player | undefined;
    clearPlayersForTeam: (teamId: string) => void;
    clearError: () => void;
}

export const usePlayersStore = create<PlayersState>((set, get) => ({
    playersById: new Map(),
    playerIdsByTeam: new Map(),
    isLoading: false,
    error: null,
    lastFetchedByTeam: new Map(),

    fetchPlayersForTeam: async (teamId: string, options) => {
        const { lastFetchedByTeam, playerIdsByTeam } = get();
        const lastFetched = lastFetchedByTeam.get(teamId) || null;
        const hasData = (playerIdsByTeam.get(teamId)?.length || 0) > 0;

        const strategy = shouldRefetch(hasData, lastFetched, options?.force);

        if (strategy === "skip") return;

        if (strategy === "background") {
            const result = await getTeamPlayersAction({ teamId });
            if (result.ok) {
                get().setPlayersForTeam(teamId, result.value);
            }
            return;
        }

        set({ isLoading: true, error: null });

        const result = await getTeamPlayersAction({ teamId });

        if (!result.ok) {
            set({ isLoading: false, error: result.error.message });
            return;
        }

        set((state) => {
            const newPlayersById = new Map(state.playersById);
            const newPlayerIdsByTeam = new Map(state.playerIdsByTeam);
            const newLastFetchedByTeam = new Map(state.lastFetchedByTeam);

            const playerIds = result.value.map((p) => {
                newPlayersById.set(p.id, p);
                return p.id;
            });

            newPlayerIdsByTeam.set(teamId, playerIds);
            newLastFetchedByTeam.set(teamId, Date.now());

            return {
                playersById: newPlayersById,
                playerIdsByTeam: newPlayerIdsByTeam,
                lastFetchedByTeam: newLastFetchedByTeam,
                isLoading: false,
                error: null,
            };
        });
    },

    setPlayersForTeam: (teamId: string, players: Player[]) => {
        set((state) => {
            const newPlayersById = new Map(state.playersById);
            const newPlayerIdsByTeam = new Map(state.playerIdsByTeam);
            const newLastFetchedByTeam = new Map(state.lastFetchedByTeam);

            const playerIds = players.map((p) => {
                newPlayersById.set(p.id, p);
                return p.id;
            });

            newPlayerIdsByTeam.set(teamId, playerIds);
            newLastFetchedByTeam.set(teamId, Date.now());

            return {
                playersById: newPlayersById,
                playerIdsByTeam: newPlayerIdsByTeam,
                lastFetchedByTeam: newLastFetchedByTeam,
            };
        });
    },

    addPlayerToTeam: async (
        teamId: string,
        robloxUserId: string,
        username: string,
        displayName?: string | null,
        avatarUrl?: string | null
    ) => {
        set({ isLoading: true, error: null });

        const result = await savePlayerToTeamAction({
            teamId,
            robloxUserId,
            username,
            displayName,
            avatarUrl,
        });

        if (!result.ok) {
            set({ isLoading: false, error: result.error.message });
            return { ok: false, error: result.error.message };
        }

        const newPlayer = result.value;

        set((state) => {
            const newPlayersById = new Map(state.playersById);
            newPlayersById.set(newPlayer.id, newPlayer);

            const newPlayerIdsByTeam = new Map(state.playerIdsByTeam);
            const existing = newPlayerIdsByTeam.get(teamId) || [];
            newPlayerIdsByTeam.set(teamId, [...existing, newPlayer.id]);

            return {
                playersById: newPlayersById,
                playerIdsByTeam: newPlayerIdsByTeam,
                isLoading: false,
                error: null,
            };
        });

        return { ok: true, player: newPlayer };
    },

    removePlayerFromTeam: async (robloxUserId: string, teamId: string) => {
        set({ isLoading: true, error: null });

        const result = await removePlayerFromTeamAction({ robloxUserId });

        if (!result.ok) {
            set({ isLoading: false, error: result.error.message });
            return { ok: false, error: result.error.message };
        }

        set((state) => {
            const newPlayersById = new Map(state.playersById);
            const updatedPlayer = { ...result.value, team_id: null };
            newPlayersById.set(result.value.id, updatedPlayer);

            const newPlayerIdsByTeam = new Map(state.playerIdsByTeam);
            const existing = newPlayerIdsByTeam.get(teamId) || [];
            newPlayerIdsByTeam.set(
                teamId,
                existing.filter((id) => {
                    const player = newPlayersById.get(id);
                    return player?.roblox_user_id !== robloxUserId;
                })
            );

            return {
                playersById: newPlayersById,
                playerIdsByTeam: newPlayerIdsByTeam,
                isLoading: false,
                error: null,
            };
        });

        return { ok: true };
    },

    getPlayersByTeam: (teamId: string) => {
        const { playersById, playerIdsByTeam } = get();
        const playerIds = playerIdsByTeam.get(teamId) || [];
        return playerIds.map((id) => playersById.get(id)).filter((p): p is Player => p !== undefined);
    },

    getPlayerById: (playerId: string) => {
        return get().playersById.get(playerId);
    },

    clearPlayersForTeam: (teamId: string) => {
        set((state) => {
            const newPlayerIdsByTeam = new Map(state.playerIdsByTeam);
            const playerIds = newPlayerIdsByTeam.get(teamId) || [];

            const newPlayersById = new Map(state.playersById);
            playerIds.forEach((id) => newPlayersById.delete(id));

            newPlayerIdsByTeam.delete(teamId);

            const newLastFetchedByTeam = new Map(state.lastFetchedByTeam);
            newLastFetchedByTeam.delete(teamId);

            return {
                playersById: newPlayersById,
                playerIdsByTeam: newPlayerIdsByTeam,
                lastFetchedByTeam: newLastFetchedByTeam,
            };
        });
    },

    clearError: () => set({ error: null }),
}));