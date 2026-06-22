"use client";

import { createContext, useContext } from "react";
import type { Region } from "@/shared/types/db";
import type { SeasonWithPlayoffConfig } from "@/server/domains/season";

interface SeasonContextValue {
    season: SeasonWithPlayoffConfig;
    region: Region;
}

const SeasonContext = createContext<SeasonContextValue | null>(null);

export function SeasonProvider({
    season,
    region,
    children,
}: SeasonContextValue & { children: React.ReactNode }) {
    return (
        <SeasonContext.Provider value={{ season, region }}>
            {children}
        </SeasonContext.Provider>
    );
}

export function useSeasonContext(): SeasonContextValue {
    const ctx = useContext(SeasonContext);
    if (!ctx) throw new Error("useSeasonContext must be used within SeasonProvider");
    return ctx;
}
