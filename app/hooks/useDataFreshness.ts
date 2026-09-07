"use client";

import {useCallback, useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {mutate as globalMutate} from "swr";
import type {CacheTag} from "@/server/cache/tags";

const POLL_MS = 45_000;

async function fetchVersion(tag: CacheTag): Promise<number | null> {
    try {
        const res = await fetch(`/api/version?tags=${tag}`, {cache: "no-store"});
        if (!res.ok) return null;
        const body = (await res.json()) as Record<string, number>;
        return typeof body[tag] === "number" ? body[tag] : null;
    } catch {
        return null;
    }
}

export function useDataFreshness({tag, baseline}: {tag: CacheTag; baseline: number}) {
    const router = useRouter();
    const [latest, setLatest] = useState(baseline);
    const [acknowledged, setAcknowledged] = useState(baseline);

    useEffect(() => {
        setLatest(prev => (baseline > prev ? baseline : prev));
        setAcknowledged(prev => (baseline > prev ? baseline : prev));
    }, [baseline]);

    useEffect(() => {
        let cancelled = false;
        const check = async () => {
            const v = await fetchVersion(tag);
            if (!cancelled && v !== null) setLatest(prev => (v > prev ? v : prev));
        };

        void check();
        const id = window.setInterval(check, POLL_MS);
        const onVisible = () => {
            if (document.visibilityState === "visible") void check();
        };
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", onVisible);

        return () => {
            cancelled = true;
            window.clearInterval(id);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", onVisible);
        };
    }, [tag]);

    const stale = latest > acknowledged;

    const refresh = useCallback(() => {
        setAcknowledged(latest);
        void globalMutate(key => Array.isArray(key) && key[0] === "rangedLeaderboard");
        router.refresh();
    }, [latest, router]);

    const dismiss = useCallback(() => setAcknowledged(latest), [latest]);

    return {stale, refresh, dismiss};
}
