"use client";

import { useEffect, useLayoutEffect } from "react";
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

    // Seed the store from server-computed values before first paint.
    // useLayoutEffect fires synchronously after DOM mutations, before the browser paints,
    // keeping the "no-flash" guarantee while staying outside the render phase.
    useLayoutEffect(() => {
        if (initialSeasonId && !usePublicContextStore.getState().selectedSeasonId) {
            usePublicContextStore.setState({
                selectedSeasonId: initialSeasonId,
                selectedRegionId: initialRegionId,
            });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally empty: seed once on mount from server props

    useEffect(() => {
        if (!loadingRegions && !loadingSeasons && regions.length > 0 && seasons.length > 0) {
            initializeDefaults(regions, seasons);
        }
    }, [loadingRegions, loadingSeasons, regions, seasons, initializeDefaults]);

    return <>{children}</>;
}
