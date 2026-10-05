import { getYoutubeId } from '@/shared/utils/youtube'

export { getYoutubeId, isYoutubeShort } from '@/shared/utils/youtube'

export function getYoutubeThumbnail(url: string): string | null {
    const id = getYoutubeId(url)
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

export function getYoutubePoster(id: string, quality: 'maxres' | 'hq' = 'maxres'): string {
    return `https://img.youtube.com/vi/${id}/${quality === 'maxres' ? 'maxresdefault' : 'hqdefault'}.jpg`
}

export function resolveMediaThumbnail(imageUrl: string | null, videoUrl: string | null | undefined): string | null {
    if (imageUrl) return imageUrl
    if (videoUrl) return getYoutubeThumbnail(videoUrl)
    return null
}

export function toEmbedUrl(url: string): string | null {
    try {
        const u = new URL(url)
        if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
            const id = getYoutubeId(url)
            return id ? `https://www.youtube.com/embed/${id}` : null
        }
        if (u.hostname.includes('twitch.tv')) {
            const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const channel = u.pathname.replace(/^\/videos\//, '').replace(/^\//, '')
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
