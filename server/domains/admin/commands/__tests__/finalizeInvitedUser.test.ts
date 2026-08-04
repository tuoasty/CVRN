import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Ok, Err } from '@/shared/types/result'

vi.mock('@/server/db/admin.repo', () => ({
    findPendingUsersByEmail: vi.fn(),
    insertUserRole: vi.fn(),
    deletePendingUser: vi.fn(),
}))
vi.mock('@/server/utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }))

import { findPendingUsersByEmail, insertUserRole, deletePendingUser } from '@/server/db/admin.repo'
import { finalizeInvitedUser } from '../finalizeInvitedUser'

const USER_ID = 'user-1'
const EMAIL = 'person@example.com'

function pendingRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'pending-1',
        email: EMAIL,
        requested_at: null,
        notes: null,
        role: 'stat_tracker',
        invited_by: 'super-1',
        accepted: false,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        ...overrides,
    }
}

describe('finalizeInvitedUser', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(insertUserRole).mockResolvedValue(Ok(true))
        vi.mocked(deletePendingUser).mockResolvedValue(Ok(true))
    })

    it('returns NOT_FOUND when no invite exists', async () => {
        vi.mocked(findPendingUsersByEmail).mockResolvedValue(Ok(null))

        const result = await finalizeInvitedUser(USER_ID, EMAIL)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
        expect(insertUserRole).not.toHaveBeenCalled()
    })

    it('returns INVITE_EXPIRED and assigns no role when the invite has lapsed', async () => {
        vi.mocked(findPendingUsersByEmail).mockResolvedValue(
            Ok(pendingRow({ expires_at: new Date(Date.now() - 1000).toISOString() }))
        )

        const result = await finalizeInvitedUser(USER_ID, EMAIL)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('INVITE_EXPIRED')
        expect(insertUserRole).not.toHaveBeenCalled()
        expect(deletePendingUser).not.toHaveBeenCalled()
    })

    it('accepts an invite with no expiry set', async () => {
        vi.mocked(findPendingUsersByEmail).mockResolvedValue(Ok(pendingRow({ expires_at: null })))

        const result = await finalizeInvitedUser(USER_ID, EMAIL)

        expect(result.ok).toBe(true)
        expect(insertUserRole).toHaveBeenCalledWith({
            userId: USER_ID,
            role: 'stat_tracker',
            promotedBy: 'super-1',
        })
    })

    it('assigns the role then clears the invite on success', async () => {
        vi.mocked(findPendingUsersByEmail).mockResolvedValue(Ok(pendingRow()))

        const result = await finalizeInvitedUser(USER_ID, EMAIL)

        expect(result.ok).toBe(true)
        expect(insertUserRole).toHaveBeenCalledOnce()
        expect(deletePendingUser).toHaveBeenCalledWith(EMAIL)
    })

    it('leaves the invite in place when the role write fails', async () => {
        vi.mocked(findPendingUsersByEmail).mockResolvedValue(Ok(pendingRow()))
        vi.mocked(insertUserRole).mockResolvedValue(Err({ message: 'boom', code: 'DB_ERROR' }))

        const result = await finalizeInvitedUser(USER_ID, EMAIL)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('DB_ERROR')
        expect(deletePendingUser).not.toHaveBeenCalled()
    })

    it('is idempotent across repeated calls while the invite still exists', async () => {
        vi.mocked(findPendingUsersByEmail).mockResolvedValue(Ok(pendingRow()))

        const first = await finalizeInvitedUser(USER_ID, EMAIL)
        const second = await finalizeInvitedUser(USER_ID, EMAIL)

        expect(first.ok).toBe(true)
        expect(second.ok).toBe(true)
        expect(insertUserRole).toHaveBeenCalledTimes(2)
    })
})
