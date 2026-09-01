export type MediaPostType = 'gfx' | 'video' | 'news' | 'recap' | 'clip' | 'totw' | 'potw'

export type MatchMediaSlot = Extract<MediaPostType, 'gfx' | 'video'>

export interface MediaPost {
    id: string
    type: MediaPostType
    title: string
    description: string | null
    image_url: string | null
    video_url: string | null
    author_id: string | null
    match_id: string | null
    team_id: string | null
    player_id: string | null
    season_id: string | null
    article_id: string | null
    published_at: string
    is_pinned: boolean
    pinned_at: string | null
    created_by: string
    created_at: string
    updated_at: string | null
}

export interface InsertMediaPostDto {
    id: string
    type: MediaPostType
    title: string
    description?: string | null
    image_url?: string | null
    video_url?: string | null
    author_id?: string | null
    match_id?: string | null
    team_id?: string | null
    player_id?: string | null
    season_id?: string | null
    article_id?: string | null
    created_by: string
}

export interface CreateMediaInput {
    type: 'gfx' | 'video' | 'clip' | 'totw' | 'potw'
    title: string
    description?: string | null
    imageFile?: File | null
    videoUrl?: string | null
    authorId?: string | null
    matchId?: string | null
    teamId?: string | null
    playerId?: string | null
    seasonId?: string | null
    userId: string
}

export interface DeleteMediaInput {
    postId: string
    userId: string
}

export interface PagedMediaResult {
    posts: MediaPost[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

export type {
    CreateMediaFormInput,
    MediaPostIdInput,
    UpdateMediaPostInput,
    GetAllMediaInput,
    GetPagedMediaInput,
    MediaFilterType,
    AssignMediaToMatchInput,
} from './schemas'

export {
    CreateMediaFormSchema,
    MediaPostIdSchema,
    UpdateMediaPostSchema,
    GetAllMediaSchema,
    GetPagedMediaSchema,
    AssignMediaToMatchSchema,
    MEDIA_FILTER_TYPES,
} from './schemas'
