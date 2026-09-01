"use client"

import React, { useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { useSeasons } from "@/app/hooks/useSeasons"
import { useRegions } from "@/app/hooks/useRegions"

const NONE = "__none__"

interface SeasonSelectProps {
    value: string | null
    onChange: (seasonId: string | null) => void
}

export default function SeasonSelect({ value, onChange }: SeasonSelectProps) {
    const { seasons } = useSeasons()
    const { regions } = useRegions()

    const regionCode = useMemo(() => {
        const m = new Map<string, string>()
        for (const r of regions) m.set(r.id, r.code)
        return m
    }, [regions])

    const sorted = useMemo(() => {
        return [...seasons].sort((a, b) => {
            const rc = (regionCode.get(a.region_id) ?? "").localeCompare(regionCode.get(b.region_id) ?? "")
            return rc !== 0 ? rc : a.name.localeCompare(b.name)
        })
    }, [seasons, regionCode])

    return (
        <Select value={value ?? NONE} onValueChange={v => onChange(v === NONE ? null : v)}>
            <SelectTrigger className="rounded-sm w-full sm:w-64">
                <SelectValue placeholder="Select a season" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={NONE}>No season (global)</SelectItem>
                {sorted.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                        {(regionCode.get(s.region_id) ?? "—")} · {s.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
