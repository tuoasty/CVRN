'use client'

import { useMemo, useState } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { Button } from '@/app/components/ui/button'
import { useIsSuperAdmin } from '@/app/admin/AdminRoleProvider'
import { startCardBulk, useCardBulkStatus, useCardPlayerIds } from '@/app/hooks/useCardBulk'
import { toast } from '@/app/utils/toast'
import type { CardBulkMode, CardGroup } from '@/server/domains/playerCard'
import { bulkControlState } from './cardBulk'

const COUNT = 'font-mono tabular-nums'

export default function CardBulkControls({ seasonNumber, region, group, rows, dirty }: {
    seasonNumber: number | null
    region: string | null
    group: CardGroup | null
    rows: { playerId: string }[]
    dirty: boolean
}) {
    const isSuperAdmin = useIsSuperAdmin()
    const { isRunning } = useCardBulkStatus()
    const { playerIds, isLoading } = useCardPlayerIds(seasonNumber, group?.id ?? null)
    const [starting, setStarting] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const regionPlayerIds = useMemo(() => rows.map(row => row.playerId), [rows])
    const { problem, missingCount, redoCount } = bulkControlState({
        regionSelected: region !== null,
        group,
        dirty,
        running: isRunning,
        regionPlayerIds,
        playerIdsWithCards: playerIds,
    })

    const busy = starting || isLoading || !!problem
    const scope = `${region?.toUpperCase()} S${seasonNumber} ${group?.name}`

    async function start(mode: CardBulkMode) {
        if (!seasonNumber || !region || !group) return false
        setStarting(true)
        try {
            const result = await startCardBulk({ seasonNumber, regionCode: region.toUpperCase(), groupId: group.id, mode })
            if (!result.ok) toast.error('Bulk generation did not start', result.error.message)
            return result.ok
        } finally {
            setStarting(false)
        }
    }

    async function handleConfirmRedo(e: React.MouseEvent) {
        e.preventDefault()
        await start('all')
        setConfirmOpen(false)
    }

    return (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button size="sm" className="rounded-sm" disabled={busy || missingCount === 0} onClick={() => start('missing')}>
                Generate missing (<span className={COUNT}>{missingCount}</span>)
            </Button>
            {isSuperAdmin && (
                <Button
                    size="sm"
                    variant="outline"
                    className="rounded-sm"
                    disabled={busy || redoCount === 0}
                    onClick={() => setConfirmOpen(true)}
                >
                    Redo all (<span className={COUNT}>{redoCount}</span>)
                </Button>
            )}
            {problem ? (
                <span className="text-xs text-muted-foreground">{problem}</span>
            ) : !isLoading && redoCount > 0 && missingCount === 0 ? (
                <span className="text-xs text-muted-foreground">Every player here has a card</span>
            ) : null}

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="rounded-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Redo all {redoCount} {scope} cards?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Every card in this scope is made again from the board. Hand-edited and GFX cards are replaced. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={starting} className="rounded-sm">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmRedo}
                            disabled={starting}
                            className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {starting ? 'Starting...' : 'Redo all'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
