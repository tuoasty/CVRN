"use client";

import { useState, useEffect } from "react";
import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { usePublicContextStore } from "@/app/stores/publicContextStore";

type Props = {
    children: React.ReactNode;
    initialSeasonId: string | null;
    initialRegionId: string | null;
};

export function PublicStoreInitializer({ children, initialSeasonId, initialRegionId }: Props) {
    const { regions, isLoading: loadingRegions } = useRegions();
    const { seasons, isLoading: loadingSeasons } = useSeasons();
    const { initializeDefaults } = usePublicContextStore();

    // Synchronously seed the store from server-computed values on first render,
    // before any useEffect waterfall can fire. Guard against SSR to prevent
    // Zustand singleton mutation across server requests.
    useState(() => {
        if (typeof window === "undefined") return;
        if (initialSeasonId && !usePublicContextStore.getState().selectedSeasonId) {
            usePublicContextStore.setState({
                selectedSeasonId: initialSeasonId,
                selectedRegionId: initialRegionId,
            });
        }
    });

    useEffect(() => {
        if (!loadingRegions && !loadingSeasons && regions.length > 0 && seasons.length > 0) {
            initializeDefaults(regions, seasons);
        }
    }, [loadingRegions, loadingSeasons, regions, seasons, initializeDefaults]);

    return <>{children}</>;
}
