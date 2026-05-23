import { create } from "zustand";
import { Region } from "@/shared/types/db";
import { SeasonWithPlayoffConfig } from "@/server/domains/season";

interface PublicContextState {
    selectedRegionId: string | null;
    selectedSeasonId: string | null;

    setSelectedRegionId: (regionId: string | null) => void;
    setSelectedSeasonId: (seasonId: string | null) => void;

    initializeDefaults: (regions: Region[], seasons: SeasonWithPlayoffConfig[]) => void;
}

const STORAGE_KEY = "cvrn_selected_season";

const readCookie = (): string | null => {
    if (typeof window === "undefined") return null;
    try {
        const match = document.cookie.match(new RegExp(`(?:^|; )${STORAGE_KEY}=([^;]*)`));
        return match ? decodeURIComponent(match[1]) : null;
    } catch {
        return null;
    }
};

const writeCookie = (seasonId: string) => {
    if (typeof window === "undefined") return;
    try {
        document.cookie = `${STORAGE_KEY}=${encodeURIComponent(seasonId)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } catch {}
};

export const usePublicContextStore = create<PublicContextState>((set, get) => ({
    selectedRegionId: null,
    selectedSeasonId: null,

    setSelectedRegionId: (regionId) => set({ selectedRegionId: regionId }),

    setSelectedSeasonId: (seasonId) => {
        set({ selectedSeasonId: seasonId });
        if (seasonId) {
            writeCookie(seasonId);
        }
    },

    initializeDefaults: (regions, seasons) => {
        const state = get();

        if (regions.length === 0 || seasons.length === 0) return;

        const savedSeasonId = readCookie();
        if (savedSeasonId) {
            const savedSeason = seasons.find((s) => s.id === savedSeasonId);
            if (savedSeason) {
                set({
                    selectedSeasonId: savedSeason.id,
                    selectedRegionId: savedSeason.region_id,
                });
                writeCookie(savedSeason.id); // renew cookie
                return;
            }
        }

        // Store was seeded by PublicStoreInitializer but cookie wasn't set — write it now.
        if (state.selectedSeasonId) {
            writeCookie(state.selectedSeasonId);
            return;
        }

        const asiaRegion = regions.find((r) => r.code.toUpperCase() === "AS");
        const defaultRegion = asiaRegion || regions[0];

        const activeSeason = seasons.find(
            (s) => s.region_id === defaultRegion.id && s.is_active
        );
        const fallbackSeason = seasons
            .filter((s) => s.region_id === defaultRegion.id)
            .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];

        const selectedSeason = activeSeason || fallbackSeason;

        if (selectedSeason) {
            set({
                selectedSeasonId: selectedSeason.id,
                selectedRegionId: selectedSeason.region_id
            });
            writeCookie(selectedSeason.id);
        }
    },
}));