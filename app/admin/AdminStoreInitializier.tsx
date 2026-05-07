"use client";

import { useEffect } from "react";
import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { AdminReadyContext } from "./AdminReadyContext";
import { useAdminContextStore } from "@/app/stores/adminContextStore";

export function AdminStoreInitializer({ children }: { children: React.ReactNode }) {
    const { regions, isLoading: regionsLoading } = useRegions();
    const { seasons, isLoading: seasonsLoading } = useSeasons();
    const { initializeDefaults } = useAdminContextStore();

    const ready = !regionsLoading && !seasonsLoading;

    useEffect(() => {
        if (ready && regions.length > 0 && seasons.length > 0) {
            initializeDefaults(regions, seasons);
        }
    }, [ready, regions, seasons, initializeDefaults]);

    return (
        <AdminReadyContext.Provider value={ready}>
            {children}
        </AdminReadyContext.Provider>
    );
}