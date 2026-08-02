"use client"

import { useState } from 'react'
import { Image as ImageIcon, Video } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog'
import MatchMediaSlotPanel from '@/app/features/media/MatchMediaSlot'
import { cn } from '@/lib/utils'
import type { MatchMediaSlot as Slot, MediaPost } from '@/server/domains/media'

const SLOT_META: Record<Slot, { label: string; Icon: typeof ImageIcon }> = {
    gfx:   { label: 'GFX', Icon: ImageIcon },
    video: { label: 'VOD', Icon: Video },
}

interface MatchMediaSlotButtonProps {
    matchId: string
    slot: Slot
    current: MediaPost | null
    onChanged?: () => void
    defaultTitle?: string
}

/**
 * Row-level entry point: one button per slot so attachment state is legible down the whole
 * schedule list without opening anything.
 */
export default function MatchMediaSlotButton({ matchId, slot, current, onChanged, defaultTitle }: MatchMediaSlotButtonProps) {
    const [open, setOpen] = useState(false)
    const { label, Icon } = SLOT_META[slot]

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    'h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-sm',
                    current ? 'text-primary hover:text-primary' : 'text-muted-foreground/50',
                )}
                title={current ? `${label}: ${current.title}` : `Attach ${label}`}
                onClick={() => setOpen(true)}
            >
                <Icon className="h-4 w-4" />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Match {label}</DialogTitle>
                        <DialogDescription>
                            One {label} per match. Removing it unlinks the post — it stays in the media feed.
                        </DialogDescription>
                    </DialogHeader>
                    <MatchMediaSlotPanel
                        slot={slot}
                        matchId={matchId}
                        current={current}
                        defaultTitle={defaultTitle}
                        onChanged={() => { setOpen(false); onChanged?.() }}
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}
