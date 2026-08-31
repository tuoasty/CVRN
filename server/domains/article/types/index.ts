export interface InsertArticleDto {
    id: string
    slug: string
    title: string
    body: string
    author_id?: string | null
    match_id?: string | null
    season_id?: string | null
    published_at?: string | null
    created_by: string
}

export interface UpdateArticleFields {
    title?: string
    body?: string
    author_id?: string | null
    match_id?: string | null
    season_id?: string | null
    published_at?: string | null
}

export interface ArticleAuthor {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
}

export interface ArticleListItem {
    id: string
    slug: string
    title: string
    snippet: string
    thumbnail_url: string | null
    author: ArticleAuthor | null
    match_id: string | null
    published_at: string | null
    created_at: string
}

export interface ArticleDetail {
    id: string
    slug: string
    title: string
    body: string
    author: ArticleAuthor | null
    match_id: string | null
    season_id: string | null
    cover_url: string | null
    match_gfx_url: string | null
    match_vod_url: string | null
    published_at: string | null
    created_at: string
    updated_at: string
}

export interface CreateArticleInput {
    title: string
    body: string
    authorId?: string | null
    matchId?: string | null
    seasonId?: string | null
    published: boolean
    imageFile?: File | null
    userId: string
}

export interface UpdateArticleInput {
    articleId: string
    title?: string
    body?: string
    authorId?: string | null
    matchId?: string | null
    seasonId?: string | null
    removeCover: boolean
    imageFile?: File | null
    userId: string
}

export interface DeleteArticleInput {
    articleId: string
}

export type {
    CreateArticleFormInput,
    UpdateArticleFormInput,
    ArticleIdInput,
    SetArticlePublishedInput,
} from './schemas'

export {
    CreateArticleFormSchema,
    UpdateArticleFormSchema,
    ArticleIdSchema,
    SetArticlePublishedSchema,
} from './schemas'
