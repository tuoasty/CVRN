export interface ByteCache {
    get(key: string): string | undefined
    set(key: string, value: string): void
    size(): number
}

export function createByteCache(opts: { maxBytes: number; ttlMs: number }): ByteCache {
    const entries = new Map<string, { at: number; value: string }>()
    let bytes = 0

    const drop = (key: string) => {
        const entry = entries.get(key)
        if (!entry) return
        bytes -= entry.value.length
        entries.delete(key)
    }

    return {
        get(key) {
            const entry = entries.get(key)
            if (!entry) return undefined
            if (Date.now() - entry.at >= opts.ttlMs) {
                drop(key)
                return undefined
            }
            entries.delete(key)
            entries.set(key, entry)
            return entry.value
        },
        set(key, value) {
            drop(key)
            if (value.length > opts.maxBytes) return
            entries.set(key, { at: Date.now(), value })
            bytes += value.length
            while (bytes > opts.maxBytes) {
                const oldest = entries.keys().next().value
                if (oldest === undefined) break
                drop(oldest)
            }
        },
        size() {
            return bytes
        },
    }
}
