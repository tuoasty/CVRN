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
    slug?: string
    author_id?: string | null
    match_id?: string | null
    season_id?: string | null
    published_at?: string | null
}

export type ImagePlacement = 'left' | 'center' | 'right'

export interface ArticleImageInput {
    handle: string
    placement: ImagePlacement
    kind: 'upload' | 'link'
    mediaPostId?: string | null
    file?: File | null
}

export interface ArticleImageRef {
    handle: string
    placement: ImagePlacement
    url: string | null
    mediaPostId: string
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
    images: ArticleImageRef[]
    match_gfx_url: string | null
    match_vod_url: string | null
    published_at: string | null
    created_at: string
    updated_at: string
}

export interface CreateArticleInput {
    title: string
    body: string
    slug?: string | null
    authorId?: string | null
    matchId?: string | null
    seasonId?: string | null
    published: boolean
    images: ArticleImageInput[]
    userId: string
}

export interface UpdateArticleInput {
    articleId: string
    title?: string
    body?: string
    slug?: string | null
    authorId?: string | null
    matchId?: string | null
    seasonId?: string | null
    images: ArticleImageInput[]
    userId: string
}

export interface DeleteArticleInput {
    articleId: string
}

export type {
    CreateArticleFormInput,
    UpdateArticleFormInput,
    ArticleImageMetaInput,
    ArticleIdInput,
    SetArticlePublishedInput,
} from './schemas'

export {
    CreateArticleFormSchema,
    UpdateArticleFormSchema,
    ArticleImagesMetaSchema,
    ArticleIdSchema,
    SetArticlePublishedSchema,
} from './schemas'
