"use client";

import { useEffect } from "react";
import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { usePublicContextStore } from "@/app/stores/publicContextStore";

export function PublicStoreInitializer({ children }: { children: React.ReactNode }) {
    const { regions, isLoading: loadingRegions } = useRegions();
    const { seasons, isLoading: loadingSeasons } = useSeasons();
    const { initializeDefaults } = usePublicContextStore();

    useEffect(() => {
        if (!loadingRegions && !loadingSeasons && regions.length > 0 && seasons.length > 0) {
            initializeDefaults(regions, seasons);
        }
    }, [loadingRegions, loadingSeasons, regions, seasons, initializeDefaults]);

    return <>{children}</>;
}
