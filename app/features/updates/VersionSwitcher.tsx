"use client"

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import type { UpdateLogIndexEntry } from '@/server/domains/updateLog'

interface Props {
    versions: UpdateLogIndexEntry[]
    current: string
}

export default function VersionSwitcher({ versions, current }: Props) {
    const router = useRouter()

    return (
        <Select value={current} onValueChange={v => v !== current && router.push(`/updates/${encodeURIComponent(v)}`)}>
            <SelectTrigger aria-label="Choose a version" className="h-9 w-56 rounded-sm">
                <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-sm" align="end">
                {versions.map((v, i) => (
                    <SelectItem key={v.version} value={v.version} className="rounded-sm">
                        <span className="font-mono">{v.version}</span>
                        {i === 0 && <span className="ml-2 text-xs text-muted-foreground">Latest</span>}
                        {v.title && i !== 0 && <span className="ml-2 truncate text-xs text-muted-foreground">{v.title}</span>}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
