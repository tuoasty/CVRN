export interface RecentWinnerPlayer {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
}

export interface RecentWinnerRow {
    season_id: string
    spec_id: string
    stars_awarded: number
    player: RecentWinnerPlayer
}

export interface EndedSeason {
    id: string
    name: string
    slug: string
    endDate: string
}

export interface RecentSpecWinners {
    seasonsByRegion: Record<string, EndedSeason[]>
    winners: RecentWinnerRow[]
}

export interface RecentSpecWinnerEntry {
    season: EndedSeason
    winner: { starsAwarded: number; player: RecentWinnerPlayer } | null
}
