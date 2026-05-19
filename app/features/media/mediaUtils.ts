export function getYoutubeThumbnail(url: string): string | null {
    try {
        const u = new URL(url)
        if (u.hostname.includes('youtube.com')) {
            const v = u.searchParams.get('v')
            return v ? `https://img.youtube.com/vi/${v}/hqdefault.jpg` : null
        }
        if (u.hostname.includes('youtu.be')) {
            return `https://img.youtube.com/vi/${u.pathname.slice(1)}/hqdefault.jpg`
        }
        return null
    } catch {
        return null
    }
}

export function resolveMediaThumbnail(imageUrl: string | null, videoUrl: string | null | undefined): string | null {
    if (imageUrl) return imageUrl
    if (videoUrl) return getYoutubeThumbnail(videoUrl)
    return null
}
