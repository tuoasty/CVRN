"use client";

import {useEffect, useState} from "react";

const COOKIE = "cvrn_last_ctx=";

/**
 * The region/season the reader last browsed, written by `RegionSeasonSelector` and read
 * here from the `cvrn_last_ctx` cookie.
 *
 * For pages that sit outside a season but still want to point back into one. Returns
 * null until the effect runs, and on a first-ever visit where no cookie exists — callers
 * must have a destination that works without it.
 */
export function useLastSeasonContext(): {region: string; season: string} | null {
    const [context, setContext] = useState<{region: string; season: string} | null>(null);

    useEffect(() => {
        const entry = document.cookie
            .split(";")
            .map(c => c.trim())
            .find(c => c.startsWith(COOKIE));
        if (!entry) return;

        const [region, season] = entry.slice(COOKIE.length).split(":");
        if (region && season) setContext({region, season});
    }, []);

    return context;
}
