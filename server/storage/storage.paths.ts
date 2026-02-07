export const BUCKETS = {
    PUBLIC: "public-assets"
}  as const

export const STORAGE_PATHS = {
    teamLogo(teamId:string, ext:string){
        return `teams/${teamId}.${ext}`
    }
}