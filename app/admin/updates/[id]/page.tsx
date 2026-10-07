import { notFound } from 'next/navigation'
import { getUpdateLogForAdminAction } from '@/app/actions/updateLog.actions'
import UpdateLogEditor from '@/app/features/updates/editor/UpdateLogEditor'

type PageProps = {
    params: Promise<{ id: string }>
}

export default async function EditUpdateLogPage({ params }: PageProps) {
    const { id } = await params
    const result = await getUpdateLogForAdminAction({ updateLogId: id })

    if (!result.ok) {
        if (result.error.code === 'NOT_FOUND') notFound()
        return (
            <div className="admin-container">
                <div className="panel p-6 mt-6">
                    <p className="text-destructive">Failed to load update log: {result.error.message}</p>
                </div>
            </div>
        )
    }

    return <UpdateLogEditor key={result.value.log.id} initial={result.value.log} initialImages={result.value.images} />
}
