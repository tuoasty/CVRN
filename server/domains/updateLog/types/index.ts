export interface InsertUpdateLogDto {
    version: string
    title: string | null
    body: string
    released_at: string
    created_by: string
}

export interface UpdateUpdateLogFields {
    version?: string
    title?: string | null
    body?: string
    released_at?: string
    published_at?: string | null
}

export interface UpdateLogListItem {
    id: string
    version: string
    title: string | null
    released_at: string
    published_at: string | null
    created_at: string
    updated_at: string
}

export interface UpdateLogAdminDetail extends UpdateLogListItem {
    body: string
}

export interface UpdateLogIndexEntry {
    version: string
    title: string | null
    released_at: string
}

export interface UpdateLogPublic {
    version: string
    title: string | null
    body: string
    released_at: string
}

export interface CreateUpdateLogInput {
    version: string
    title: string | null
    body: string
    releasedAt: string
    userId: string
}

export interface UpdateUpdateLogInput {
    updateLogId: string
    version: string
    title: string | null
    body: string
    releasedAt: string
}

export interface DeleteUpdateLogInput {
    updateLogId: string
}

export type {
    CreateUpdateLogFormInput,
    UpdateUpdateLogFormInput,
    UpdateLogIdInput,
    SetUpdateLogPublishedInput,
} from './schemas'

export {
    UPDATE_LOG_VERSION_PATTERN,
    CreateUpdateLogFormSchema,
    UpdateUpdateLogFormSchema,
    UpdateLogIdSchema,
    SetUpdateLogPublishedSchema,
} from './schemas'
