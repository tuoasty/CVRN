"use client"

import Link from 'next/link'
import { useCardCatalog } from '@/app/hooks/usePlayerCard'
import CardTemplateCatalog from '@/app/features/playerCard/CardTemplateCatalog'
import CardBulkStatus from '@/app/features/playerCard/CardBulkStatus'
import { LINK } from '@/app/features/playerCard/cardFormStyles'

export default function AdminCardGroupsPage() {
    const { groups, isLoading, error } = useCardCatalog()

    return (
        <div className="page-wide py-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Card Groups</h1>
                <span className="text-sm text-muted-foreground">Groups and their OVR tiers · tier 1 is the highest</span>
                <Link href="/admin/cards" className={LINK}>Layout and generate</Link>
            </div>

            <CardBulkStatus />

            <div className="mt-6">
                {isLoading ? (
                    <div className="h-40 animate-pulse bg-muted/40" />
                ) : error ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : (
                    <CardTemplateCatalog groups={groups} />
                )}
            </div>
        </div>
    )
}
