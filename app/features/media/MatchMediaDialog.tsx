"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clapperboard } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/app/components/ui/dialog'
import MatchMediaSlotPanel from '@/app/features/media/MatchMediaSlot'
import type { MediaPost } from '@/server/domains/media'

interface MatchMediaDialogProps {
    matchId: string
    mediaPosts: MediaPost[]
    defaultTitle?: string
}

export default function MatchMediaDialog({ matchId, mediaPosts, defaultTitle }: MatchMediaDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)

    const gfx = mediaPosts.find(p => p.type === 'gfx') ?? null
    const vod = mediaPosts.find(p => p.type === 'video') ?? null

    function handleChanged() {
        router.refresh()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-sm gap-1.5">
                    <Clapperboard className="h-4 w-4" />
                    Match Media
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Match Media</DialogTitle>
                    <DialogDescription>
                        One graphic and one VOD per match. Removing a slot unlinks the post — it stays in the media feed.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <MatchMediaSlotPanel slot="gfx" matchId={matchId} current={gfx} onChanged={handleChanged} defaultTitle={defaultTitle} />
                    <MatchMediaSlotPanel slot="video" matchId={matchId} current={vod} onChanged={handleChanged} defaultTitle={defaultTitle} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
