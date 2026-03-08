import { create } from "zustand";
import { Region } from "@/shared/types/db";
import { SeasonWithPlayoffConfig } from "@/server/dto/season.dto";

interface PublicContextState {
    selectedRegionId: string | null;
    selectedSeasonId: string | null;

    setSelectedRegionId: (regionId: string | null) => void;
    setSelectedSeasonId: (seasonId: string | null) => void;

    initializeDefaults: (regions: Region[], seasons: SeasonWithPlayoffConfig[]) => void;
}

const STORAGE_KEY = "cvrn_selected_season";

const loadFromLocalStorage = (): string | null => {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
};

const saveToLocalStorage = (seasonId: string) => {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, seasonId);
    } catch {

    }
};

export const usePublicContextStore = create<PublicContextState>((set, get) => ({
    selectedRegionId: null,
    selectedSeasonId: null,

    setSelectedRegionId: (regionId) => set({ selectedRegionId: regionId }),

    setSelectedSeasonId: (seasonId) => {
        set({ selectedSeasonId: seasonId });
        if (seasonId) {
            saveToLocalStorage(seasonId);
        }
    },

    initializeDefaults: (regions, seasons) => {
        const state = get();

        if (state.selectedSeasonId) return;

        if (regions.length === 0 || seasons.length === 0) return;

        const savedSeasonId = loadFromLocalStorage();
        if (savedSeasonId) {
            const savedSeason = seasons.find((s) => s.id === savedSeasonId);
            if (savedSeason) {
                set({
                    selectedSeasonId: savedSeason.id,
                    selectedRegionId: savedSeason.region_id,
                });
                return;
            }
        }

        const asiaRegion = regions.find((r) => r.code.toUpperCase() === "AS");
        const defaultRegion = asiaRegion || regions[0];

        const activeSeason = seasons.find(
            (s) => s.region_id === defaultRegion.id && s.is_active
        );
        const fallbackSeason = seasons.find((s) => s.region_id === defaultRegion.id);

        const selectedSeason = activeSeason || fallbackSeason;

        if (selectedSeason) {
            set({
                selectedSeasonId: selectedSeason.id,
                selectedRegionId: selectedSeason.region_id
            });
            saveToLocalStorage(selectedSeason.id);
        }
    },
}));