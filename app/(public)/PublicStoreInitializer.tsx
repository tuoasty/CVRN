// /app/(public)/PublicStoreInitializer.tsx

"use client";

import { useEffect, useState } from "react";
import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { usePublicContextStore } from "@/app/stores/publicContextStore";

export function PublicStoreInitializer({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false);
    const { regions, isLoading: loadingRegions } = useRegions();
    const { seasons, isLoading: loadingSeasons } = useSeasons();
    const { initializeDefaults } = usePublicContextStore();

    useEffect(() => {
        if (!loadingRegions && !loadingSeasons) {
            if (regions.length > 0 && seasons.length > 0) {
                initializeDefaults(regions, seasons);
            }
            setReady(true);
        }
    }, [loadingRegions, loadingSeasons, regions, seasons, initializeDefaults]);

    if (!ready || loadingRegions || loadingSeasons) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return <>{children}</>;
}