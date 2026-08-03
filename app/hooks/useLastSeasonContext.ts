"use client";

import {useEffect, useState} from "react";

const COOKIE = "cvrn_last_ctx=";

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
