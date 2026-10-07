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

export interface UpdateLogImageRef {
    name: string
    url: string
    caption: string | null
}

export interface UpdateLogAdminImage extends UpdateLogImageRef {
    id: string
}

export interface UpdateLogEditorData {
    log: UpdateLogAdminDetail
    images: UpdateLogAdminImage[]
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
    images: UpdateLogImageRef[]
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

export interface UploadUpdateLogImageInput {
    updateLogId: string
    name: string
    caption: string | null
    file: File
    userId: string
}

export interface UpdateLogImageChange {
    id: string
    name: string
    caption: string | null
}

export interface UpdateUpdateLogImagesInput {
    updateLogId: string
    changes: UpdateLogImageChange[]
    removedIds: string[]
}

export type {
    CreateUpdateLogFormInput,
    UpdateUpdateLogFormInput,
    UpdateLogIdInput,
    SetUpdateLogPublishedInput,
    UploadUpdateLogImageFormInput,
    UpdateUpdateLogImagesFormInput,
} from './schemas'

export {
    UPDATE_LOG_VERSION_PATTERN,
    CreateUpdateLogFormSchema,
    UpdateUpdateLogFormSchema,
    UpdateLogIdSchema,
    SetUpdateLogPublishedSchema,
    UploadUpdateLogImageFormSchema,
    UpdateUpdateLogImagesSchema,
    UPDATE_LOG_IMAGE_MAX_BYTES,
} from './schemas'
