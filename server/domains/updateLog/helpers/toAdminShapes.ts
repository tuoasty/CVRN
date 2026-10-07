import { UpdateLog } from '@/shared/types/db'
import { UpdateLogAdminDetail, UpdateLogListItem } from '../types'

export function toUpdateLogListItem(row: UpdateLog): UpdateLogListItem {
    return {
        id:           row.id,
        version:      row.version,
        title:        row.title,
        released_at:  row.released_at,
        published_at: row.published_at,
        created_at:   row.created_at,
        updated_at:   row.updated_at,
    }
}

export function toUpdateLogAdminDetail(row: UpdateLog): UpdateLogAdminDetail {
    return { ...toUpdateLogListItem(row), body: row.body }
}
