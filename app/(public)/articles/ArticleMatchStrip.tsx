"use client"

import { useState } from "react"
import Link from "next/link"
import { Play } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import VideoEmbedDialog from "@/app/features/media/VideoEmbedDialog"
import { cn } from "@/lib/utils"
import type { MatchSet } from "@/shared/types/db"

type Props = {
    sets: MatchSet[]
    matchHref: string | null
    vodUrl: string | null
}

export default function ArticleMatchStrip({ sets, matchHref, vodUrl }: Props) {
    const [vodOpen, setVodOpen] = useState(false)

    const orderedSets = [...sets].sort((a, b) => a.set_number - b.set_number)
    const hasSets = orderedSets.length > 0

    if (!hasSets && !matchHref && !vodUrl) return null

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {hasSets && (
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sets</span>
                    <div className="flex flex-wrap gap-2.5 font-mono text-sm tabular-nums">
                        {orderedSets.map(s => (
                            <span key={s.set_number}>
                                <span className={cn(s.home_score < s.away_score && "text-muted-foreground")}>{s.home_score}</span>
                                <span className="text-muted-foreground">–</span>
                                <span className={cn(s.away_score < s.home_score && "text-muted-foreground")}>{s.away_score}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="ml-auto flex gap-2">
                {matchHref && (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={matchHref}>View match →</Link>
                    </Button>
                )}
                {vodUrl && (
                    <Button size="sm" onClick={() => setVodOpen(true)}>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Watch VOD
                    </Button>
                )}
            </div>

            {vodUrl && <VideoEmbedDialog url={vodUrl} open={vodOpen} onOpenChange={setVodOpen} />}
        </div>
    )
}
