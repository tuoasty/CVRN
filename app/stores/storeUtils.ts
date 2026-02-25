export const STALE_TIME = 5 * 60 * 1000;

export function isStale(lastFetched: number | null): boolean {
    return !lastFetched || Date.now() - lastFetched > STALE_TIME;
}

export function shouldRefetch(
    hasData: boolean,
    lastFetched: number | null,
    force?: boolean
): "skip" | "background" | "loading" {
    if (!hasData || force) return "loading";

    const stale = isStale(lastFetched);
    if (!stale) return "skip";

    return "background";
}
