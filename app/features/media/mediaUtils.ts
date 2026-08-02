export function getYoutubeId(url: string): string | null {
    try {
        const u = new URL(url)
        if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
        if (u.hostname.includes('youtu.be'))    return u.pathname.slice(1) || null
        return null
    } catch {
        return null
    }
}

export function getYoutubeThumbnail(url: string): string | null {
    const id = getYoutubeId(url)
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

/**
 * maxres is the only variant large enough for a full-width player, but it doesn't exist for
 * every upload — YouTube answers those with a 120×90 grey placeholder rather than a 404, so
 * callers detect the miss by natural size, not by an error. hqdefault always exists.
 */
export function getYoutubePoster(id: string, quality: 'maxres' | 'hq' = 'maxres'): string {
    return `https://img.youtube.com/vi/${id}/${quality === 'maxres' ? 'maxresdefault' : 'hqdefault'}.jpg`
}

export function resolveMediaThumbnail(imageUrl: string | null, videoUrl: string | null | undefined): string | null {
    if (imageUrl) return imageUrl
    if (videoUrl) return getYoutubeThumbnail(videoUrl)
    return null
}

/** Twitch embeds require the host page's domain, so this only resolves in the browser. */
export function toEmbedUrl(url: string): string | null {
    try {
        const u = new URL(url)
        if (u.hostname.includes('youtube.com')) {
            const v = u.searchParams.get('v')
            return v ? `https://www.youtube.com/embed/${v}` : null
        }
        if (u.hostname.includes('youtu.be')) {
            return `https://www.youtube.com/embed${u.pathname}`
        }
        if (u.hostname.includes('twitch.tv')) {
            const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const channel = u.pathname.replace(/^\/videos\//, '')
            const isVod = u.pathname.startsWith('/videos/')
            return isVod
                ? `https://player.twitch.tv/?video=${channel}&parent=${parent}`
                : `https://player.twitch.tv/?channel=${channel}&parent=${parent}`
        }
        return url
    } catch {
        return null
    }
}

export function withAutoplay(embedUrl: string): string {
    const separator = embedUrl.includes('?') ? '&' : '?'
    return embedUrl.includes('player.twitch.tv')
        ? `${embedUrl}${separator}autoplay=true`
        : `${embedUrl}${separator}autoplay=1`
}
