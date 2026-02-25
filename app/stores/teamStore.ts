import {TeamWithRegion} from "@/server/dto/team.dto";
import {create} from "zustand/react";
import {
    createTeamAction, deleteTeamAction,
    getAllTeamsWithRegionsAction,
    getTeamWithRegionAndPlayersAction
} from "@/app/actions/team.actions";
import {shouldRefetch} from "@/app/stores/storeUtils";

function indexTeamsByRegion(teams: TeamWithRegion[]): {
    teamsById: Map<string, TeamWithRegion>;
    teamsByRegion: Map<string, string[]>;
} {
    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const teamsByRegion = new Map<string, string[]>();

    teams.forEach((team) => {
        if (team.regions) {
            const regionCode = team.regions.code;
            const existing = teamsByRegion.get(regionCode) || [];
            teamsByRegion.set(regionCode, [...existing, team.id]);
        }
    });

    return { teamsById, teamsByRegion };
}

function addTeamToIndex(
    team: TeamWithRegion,
    teamsById: Map<string, TeamWithRegion>,
    teamsByRegion: Map<string, string[]>
): {
    teamsById: Map<string, TeamWithRegion>;
    teamsByRegion: Map<string, string[]>;
} {
    const newTeamsById = new Map(teamsById);
    newTeamsById.set(team.id, team);

    const newTeamsByRegion = new Map(teamsByRegion);
    if (team.regions) {
        const regionCode = team.regions.code;
        const existing = newTeamsByRegion.get(regionCode) || [];
        if (!existing.includes(team.id)) {
            newTeamsByRegion.set(regionCode, [...existing, team.id]);
        }
    }

    return { teamsById: newTeamsById, teamsByRegion: newTeamsByRegion };
}

interface TeamsState {
    teamsById: Map<string, TeamWithRegion>;
    teamsByRegion: Map<string, string[]>;
    isLoading: boolean;
    error: string | null;
    lastFetched: number | null;

    fetchAllTeams: (options?: { force?: boolean }) => Promise<void>;
    fetchTeamBySlug: (regionCode: string, slug: string) => Promise<TeamWithRegion | null>;
    createTeam: (data: FormData) => Promise<{ ok: boolean; error?: string; teamId?: string }>;
    deleteTeam: (teamId: string) => Promise<{ ok: boolean; error?: string }>;
    getTeamById: (teamId: string) => TeamWithRegion | undefined;
    getTeamsByRegion: (regionCode: string) => TeamWithRegion[];
    clearError: () => void;
}

export const useTeamStore = create<TeamsState>((set, get) => ({
    teamsById: new Map(),
    teamsByRegion: new Map(),
    isLoading: false,
    error: null,
    lastFetched: null,

    fetchAllTeams: async (options) => {
        const { lastFetched, teamsById } = get();
        const strategy = shouldRefetch(teamsById.size > 0, lastFetched, options?.force);

        if (strategy === "skip") return;

        if (strategy === "background") {
            const result = await getAllTeamsWithRegionsAction();
            if (result.ok) {
                const indexed = indexTeamsByRegion(result.value);
                set({
                    teamsById: indexed.teamsById,
                    teamsByRegion: indexed.teamsByRegion,
                    lastFetched: Date.now(),
                });
            }
            return;
        }

        set({ isLoading: true, error: null });

        const result = await getAllTeamsWithRegionsAction();

        if (!result.ok) {
            set({ isLoading: false, error: result.error.message });
            return;
        }

        const indexed = indexTeamsByRegion(result.value);

        set({
            teamsById: indexed.teamsById,
            teamsByRegion: indexed.teamsByRegion,
            isLoading: false,
            error: null,
            lastFetched: Date.now(),
        });
    },

    fetchTeamBySlug: async (regionCode: string, slug: string) => {
        const { teamsById } = get();

        const cachedTeam = Array.from(teamsById.values()).find(
            (t) => t.slug === slug && t.regions?.code.toLowerCase() === regionCode.toLowerCase()
        );

        if (cachedTeam) {
            return cachedTeam;
        }

        set({ isLoading: true, error: null });

        const result = await getTeamWithRegionAndPlayersAction({ slug, regionCode });

        if (!result.ok) {
            set({ isLoading: false, error: result.error.message });
            return null;
        }

        const team = result.value.team;

        set((state) => {
            const indexed = addTeamToIndex(team, state.teamsById, state.teamsByRegion);
            return {
                teamsById: indexed.teamsById,
                teamsByRegion: indexed.teamsByRegion,
                isLoading: false,
                error: null,
            };
        });

        return team;
    },

    createTeam: async (data: FormData) => {
        set({ isLoading: true, error: null });

        const result = await createTeamAction(data);

        if (!result.ok) {
            set({ isLoading: false, error: result.error.message });
            return { ok: false, error: result.error.message };
        }

        const newTeam = result.value;

        set((state) => {
            const indexed = addTeamToIndex(newTeam, state.teamsById, state.teamsByRegion);
            return {
                teamsById: indexed.teamsById,
                teamsByRegion: indexed.teamsByRegion,
                isLoading: false,
                error: null,
            };
        });

        return { ok: true, teamId: newTeam.id };
    },

    deleteTeam: async (teamId: string) => {
        set({ isLoading: true, error: null });

        const result = await deleteTeamAction({ teamId });

        if (!result.ok) {
            set({ isLoading: false, error: result.error.message });
            return { ok: false, error: result.error.message };
        }

        set((state) => {
            const newTeamsById = new Map(state.teamsById);
            const team = newTeamsById.get(teamId);
            newTeamsById.delete(teamId);

            const newTeamsByRegion = new Map(state.teamsByRegion);
            if (team?.regions) {
                const regionCode = team.regions.code;
                const existing = newTeamsByRegion.get(regionCode) || [];
                newTeamsByRegion.set(
                    regionCode,
                    existing.filter((id) => id !== teamId)
                );
            }

            return {
                teamsById: newTeamsById,
                teamsByRegion: newTeamsByRegion,
                isLoading: false,
                error: null,
            };
        });

        return { ok: true };
    },

    getTeamById: (teamId: string) => {
        return get().teamsById.get(teamId);
    },

    getTeamsByRegion: (regionCode: string) => {
        const { teamsById, teamsByRegion } = get();
        const teamIds = teamsByRegion.get(regionCode) || [];
        return teamIds.map((id) => teamsById.get(id)).filter((t): t is TeamWithRegion => t !== undefined);
    },

    clearError: () => set({ error: null }),
}))