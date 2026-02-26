import {clientLogger} from "@/app/utils/clientLogger";

export type CacheEntry<T> = {
    data: T;
    timestamp: number;
    ttl: number;
};

type CacheMap<T> = Map<string, CacheEntry<T>>;

export function isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!entry) {
        clientLogger.debug('Cache', 'Entry not found');
        return false;
    }
    const ageSeconds = Math.floor((Date.now() - entry.timestamp) / 1000);
    const isValid = Date.now() - entry.timestamp < entry.ttl;
    clientLogger.debug('Cache', 'Validation check', { isValid, ageSeconds, ttlSeconds: entry.ttl / 1000 });
    return isValid;
}

export function createCacheEntry<T>(data: T, ttl: number): CacheEntry<T> {
    return {
        data,
        timestamp: Date.now(),
        ttl,
    };
}

export function evictStaleEntries<T>(cache: CacheMap<T>): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    cache.forEach((entry, key) => {
        if (now - entry.timestamp >= entry.ttl) {
            keysToDelete.push(key);
        }
    });

    if (keysToDelete.length > 0) {
        clientLogger.info('Cache', 'Evicting stale entries', { count: keysToDelete.length, keys: keysToDelete });
    }

    keysToDelete.forEach((key) => cache.delete(key));
}

export function setupAutoEviction<T>(
    cache: CacheMap<T>,
    intervalMs: number = 60000
): () => void {
    const interval = setInterval(() => {
        evictStaleEntries(cache);
    }, intervalMs);

    return () => clearInterval(interval);
}