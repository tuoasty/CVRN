"use client"

import type { ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Props {
    customSlugs: string[]
    rail: ReactNode
    requirements: ReactNode
    children: ReactNode
}

export default function SpecDetailGrid({ customSlugs, rail, requirements, children }: Props) {
    const { slug } = useParams<{ slug: string }>()
    const custom = customSlugs.includes(slug?.toLowerCase() ?? '')

    return (
        <div
            className={cn(
                'grid grid-cols-[minmax(0,1fr)] gap-10 min-[900px]:grid-cols-[230px_minmax(0,1fr)]',
                !custom && 'min-[1200px]:grid-cols-[230px_minmax(0,1fr)_330px]',
            )}
        >
            {rail}
            <div className="min-w-0">{children}</div>
            {!custom && <div className="min-[900px]:col-start-2 min-[1200px]:col-start-auto">{requirements}</div>}
        </div>
    )
}
