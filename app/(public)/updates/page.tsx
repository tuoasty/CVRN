import type { Metadata } from 'next'
import { getCachedUpdateLogByVersion, getCachedUpdateLogIndex } from '@/server/cache/publicReads'
import UpdateLogView from '@/app/features/updates/UpdateLogView'

export const metadata: Metadata = {
    title: 'Updates',
    description: 'Game update logs and patch notes.',
}

export default async function UpdatesPage() {
    const index = await getCachedUpdateLogIndex()
    const latest = index[0]
    const log = latest ? await getCachedUpdateLogByVersion(latest.version) : null

    if (!log) {
        return (
            <div className="mx-auto max-w-3xl px-7 pb-20 pt-6">
                <p className="py-16 text-center text-sm text-muted-foreground">No updates published yet.</p>
            </div>
        )
    }

    return <UpdateLogView log={log} index={index} />
}
