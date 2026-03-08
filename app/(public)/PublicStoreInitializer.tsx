// /app/(public)/PublicStoreInitializer.tsx

"use client";

import { useEffect, useState } from "react";
import { useRegionsStore } from "@/app/stores/regionStore";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { usePublicContextStore } from "@/app/stores/publicContextStore";

export function PublicStoreInitializer({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false);
    const { allRegionsCache, fetchAllRegions } = useRegionsStore();
    const { allSeasonsCache, fetchAllSeasons } = useSeasonsStore();
    const { initializeDefaults } = usePublicContextStore();

    useEffect(() => {
        Promise.all([fetchAllRegions(), fetchAllSeasons()]).then(() => {
            const regions = allRegionsCache?.data || [];
            const seasons = allSeasonsCache?.data || [];

            if (regions.length > 0 && seasons.length > 0) {
                initializeDefaults(regions, seasons);
            }

            setReady(true);
        });
    }, [allRegionsCache, allSeasonsCache, fetchAllRegions, fetchAllSeasons, initializeDefaults]);

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return <>{children}</>;
}