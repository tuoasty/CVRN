export const BUCKETS = {
    PUBLIC: "public-assets"
}  as const

export const STORAGE_PATHS = {
    teamLogo(teamId:string, ext:string){
        return `teams/${teamId}.${ext}`
    }
}

export function extractStoragePath(url: string, bucket: string): string {
    const marker = `/object/public/${bucket}/`
    const idx = url.indexOf(marker)
    return idx !== -1 ? url.slice(idx + marker.length) : url
}