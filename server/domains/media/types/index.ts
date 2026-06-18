export type MediaPostType = 'gfx' | 'video' | 'news' | 'recap' | 'clip'

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
    season_id: string | null
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
    season_id?: string | null
    created_by: string
}

export interface CreateMediaInput {
    type: 'gfx' | 'video' | 'clip'
    title: string
    description?: string | null
    imageFile?: File | null
    videoUrl?: string | null
    matchId?: string | null
    teamId?: string | null
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
    GetAllMediaInput,
    GetPagedMediaInput,
    MediaFilterType,
} from './schemas'

export {
    CreateMediaFormSchema,
    MediaPostIdSchema,
    GetAllMediaSchema,
    GetPagedMediaSchema,
    MEDIA_FILTER_TYPES,
} from './schemas'
