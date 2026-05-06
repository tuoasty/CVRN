"use client";

import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { AdminReadyContext } from "./AdminReadyContext";

export function AdminStoreInitializer({ children }: { children: React.ReactNode }) {
    const { isLoading: regionsLoading } = useRegions();
    const { isLoading: seasonsLoading } = useSeasons();

    const ready = !regionsLoading && !seasonsLoading;

    return (
        <AdminReadyContext.Provider value={ready}>
            {children}
        </AdminReadyContext.Provider>
    );
}