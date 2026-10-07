import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCachedUpdateLogByVersion, getCachedUpdateLogIndex } from '@/server/cache/publicReads'
import UpdateLogView from '@/app/features/updates/UpdateLogView'

export const metadata: Metadata = {
    title: 'Updates',
    description: 'Game update logs and patch notes.',
}

type PageProps = {
    params: Promise<{ version: string }>
}

export default async function UpdateVersionPage({ params }: PageProps) {
    const { version } = await params
    const index = await getCachedUpdateLogIndex()
    if (!index.some(e => e.version === version)) redirect('/updates')

    const log = await getCachedUpdateLogByVersion(version)
    if (!log) redirect('/updates')

    return <UpdateLogView log={log} index={index} />
}
