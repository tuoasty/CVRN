const YOUTUBE_PATH_PREFIXES = ['/shorts/', '/embed/', '/live/']

export function getYoutubeId(url: string): string | null {
    try {
        const u = new URL(url)
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null
        if (!u.hostname.includes('youtube.com')) return null
        const v = u.searchParams.get('v')
        if (v) return v
        const prefix = YOUTUBE_PATH_PREFIXES.find(p => u.pathname.startsWith(p))
        if (!prefix) return null
        return u.pathname.slice(prefix.length).split('/')[0] || null
    } catch {
        return null
    }
}

export function isYoutubeShort(url: string): boolean {
    try {
        const u = new URL(url)
        return u.hostname.includes('youtube.com') && u.pathname.startsWith('/shorts/')
    } catch {
        return false
    }
}
