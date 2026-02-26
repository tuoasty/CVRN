export const STALE_TIME = 5 * 60 * 1000;
export const EVICTION_TTL = 15 * 60 * 1000;

export function isStale(lastFetched: number | null): boolean {
    return !lastFetched || Date.now() - lastFetched > STALE_TIME;
}

export function shouldRefetch(
    hasData: boolean,
    lastFetched: number | null,
    force?: boolean
): "skip" | "background" | "loading" {
    if (force) {
        return hasData ? "background" : "loading";
    }

    if (!hasData) return "loading";

    const stale = isStale(lastFetched);
    if (!stale) return "skip";

    return "background";
}

interface CachedItem<T> {
    data: T;
    cachedAt: number;
}

export function createCache<T>() {
    return new Map<string, CachedItem<T>>();
}

export function getCached<T>(
    cache: Map<string, CachedItem<T>>,
    key: string
): T | null {
    const item = cache.get(key);
    if (!item) return null;

    if (Date.now() - item.cachedAt > EVICTION_TTL) {
        cache.delete(key);
        return null;
    }

    return item.data;
}

export function setCached<T>(
    cache: Map<string, CachedItem<T>>,
    key: string,
    data: T
): void {
    cache.set(key, { data, cachedAt: Date.now() });
}

export function evictStale<T>(cache: Map<string, CachedItem<T>>): number {
    const now = Date.now();
    let evicted = 0;

    for (const [key, item] of cache.entries()) {
        if (now - item.cachedAt > EVICTION_TTL) {
            cache.delete(key);
            evicted++;
        }
    }

    return evicted;
}

export function invalidateCache<T>(cache: Map<string, CachedItem<T>>): void {
    cache.clear();
}

export function shouldEvict(cachedAt: number): boolean {
    return Date.now() - cachedAt > EVICTION_TTL;
}