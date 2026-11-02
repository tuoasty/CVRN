export const BUCKETS = {
    PUBLIC: "public-assets",
    MEDIA:  "public-assets",
    CARD_FONTS: "card-fonts",
} as const

export const STORAGE_PATHS = {
    teamLogo(teamId: string, ext: string) {
        return `teams/${teamId}.${ext}`;
    },
    teamLogoVersioned(teamId: string, ext: string) {
        return `teams/${teamId}_${Date.now()}.${ext}`;
    },
    awardAvatar(awardId: string) {
        return `awards/${awardId}.png`;
    },
    mediaPost(postId: string, ext: string) {
        return `media/${postId}.${ext}`;
    },
    updateLogImage(logId: string, imageId: string, ext: string) {
        return `update-logs/${logId}/${imageId}.${ext}`;
    },
    specPhoto(specId: string) {
        return `specs/${specId}_${Date.now()}.webp`;
    },
    cardTemplateFolder(templateId: string) {
        return `card-templates/${templateId}`;
    },
    cardTemplateAsset(templateId: string, file: string) {
        return `card-templates/${templateId}/${file}`;
    },
    playerCard(playerId: string, seasonNumber: number) {
        return `cards/${seasonNumber}/${playerId}_${Date.now()}.png`;
    },
}
export function extractStoragePath(url: string, bucket: string): string {
    const marker = `/object/public/${bucket}/`
    const idx = url.indexOf(marker)
    const path = idx !== -1 ? url.slice(idx + marker.length) : url
    return path.split("?")[0]
}