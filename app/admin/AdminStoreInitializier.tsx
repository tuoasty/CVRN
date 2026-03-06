"use client";

import { useEffect, useState } from "react";
import { useRegionsStore } from "@/app/stores/regionStore";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { AdminReadyContext } from "./AdminReadyContext";

export function AdminStoreInitializer({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false);
    const { fetchAllRegions } = useRegionsStore();
    const { fetchAllSeasons } = useSeasonsStore();

    useEffect(() => {
        Promise.all([fetchAllRegions(), fetchAllSeasons()]).finally(() => {
            setReady(true);
        });
    }, []);

    return (
        <AdminReadyContext.Provider value={ready}>
            {children}
        </AdminReadyContext.Provider>
    );
}