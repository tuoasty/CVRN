import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Ok } from '@/shared/types/result'

const singleMock = vi.fn()
const insertMock = vi.fn(() => ({ select: () => ({ single: singleMock }) }))
const fromMock = vi.fn(() => ({ insert: insertMock }))
const inviteUserByEmailMock = vi.fn()

const EXPIRES_AT = '2026-08-11T00:00:00.000Z'

vi.mock('@/server/supabase/admin', () => ({
    getSupabaseAdmin: () => ({
        from: fromMock,
        auth: { admin: { inviteUserByEmail: inviteUserByEmailMock } },
    }),
}))
vi.mock('@/server/db/admin.repo', () => ({
    deletePendingUser: vi.fn(),
    normalizeEmail: (email: string) => email.trim().toLowerCase(),
}))
vi.mock('@/server/utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }))

import { deletePendingUser } from '@/server/db/admin.repo'
import { inviteUser } from '../inviteUser'

const INVITED_BY = 'super-1'

describe('inviteUser', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.SITE_URL = 'https://cvrn.net/'
        vi.mocked(deletePendingUser).mockResolvedValue(Ok(true))
        singleMock.mockResolvedValue({ data: { expires_at: EXPIRES_AT }, error: null })
        inviteUserByEmailMock.mockResolvedValue({ error: null })
    })

    it('lowercases and trims the address everywhere it is used', async () => {
        const result = await inviteUser('  Some.Person@Example.COM ', 'staff', INVITED_BY)

        expect(result.ok).toBe(true)
        expect(deletePendingUser).toHaveBeenCalledWith('some.person@example.com')
        expect(insertMock).toHaveBeenCalledWith({
            email: 'some.person@example.com',
            role: 'staff',
            invited_by: INVITED_BY,
        })
        expect(inviteUserByEmailMock).toHaveBeenCalledWith('some.person@example.com', {
            redirectTo: 'https://cvrn.net/auth/callback',
            data: { role_label: 'Staff', expires_on: '11 August 2026' },
        })
    })

    it('passes the role label and expiry through as email metadata', async () => {
        await inviteUser('person@example.com', 'spec_manager', INVITED_BY)

        expect(inviteUserByEmailMock).toHaveBeenCalledWith('person@example.com', {
            redirectTo: 'https://cvrn.net/auth/callback',
            data: { role_label: 'Spec Manager', expires_on: '11 August 2026' },
        })
    })

    it('sends an empty expiry rather than failing when the row has none', async () => {
        singleMock.mockResolvedValue({ data: { expires_at: null }, error: null })

        const result = await inviteUser('person@example.com', 'admin', INVITED_BY)

        expect(result.ok).toBe(true)
        expect(inviteUserByEmailMock).toHaveBeenCalledWith('person@example.com', {
            redirectTo: 'https://cvrn.net/auth/callback',
            data: { role_label: 'Admin', expires_on: '' },
        })
    })

    it('writes the pending row before sending the email', async () => {
        const order: string[] = []
        singleMock.mockImplementation(async () => { order.push('insert'); return { data: { expires_at: EXPIRES_AT }, error: null } })
        inviteUserByEmailMock.mockImplementation(async () => { order.push('email'); return { error: null } })

        await inviteUser('person@example.com', 'admin', INVITED_BY)

        expect(order).toEqual(['insert', 'email'])
    })

    it('does not send an email when the pending row cannot be written', async () => {
        singleMock.mockResolvedValue({ data: null, error: { message: 'duplicate' } })

        const result = await inviteUser('person@example.com', 'admin', INVITED_BY)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('DB_ERROR')
        expect(inviteUserByEmailMock).not.toHaveBeenCalled()
    })

    it('removes the pending row again when the email fails to send', async () => {
        inviteUserByEmailMock.mockResolvedValue({ error: { message: 'smtp down' } })

        const result = await inviteUser('person@example.com', 'admin', INVITED_BY)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('INTEGRATION_ERROR')
        expect(deletePendingUser).toHaveBeenCalledTimes(2)
    })
})
