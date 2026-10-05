"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { isYoutubeShort, toEmbedUrl } from '@/app/features/media/mediaUtils'
import { cn } from '@/lib/utils'

interface VideoEmbedDialogProps {
    url: string
    open: boolean
    onOpenChange: (v: boolean) => void
}

export default function VideoEmbedDialog({ url, open, onOpenChange }: VideoEmbedDialogProps) {
    const embed = toEmbedUrl(url)
    const vertical = isYoutubeShort(url)
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "p-0 overflow-hidden rounded-sm border-border bg-black",
                vertical ? "w-auto max-w-[95vw] sm:max-w-[95vw]" : "max-w-4xl sm:max-w-4xl w-[95vw]",
            )}>
                <DialogHeader className="sr-only">
                    <DialogTitle>Video Player</DialogTitle>
                </DialogHeader>
                {embed ? (
                    <div className={vertical ? "aspect-[9/16] h-[min(85vh,168vw)]" : "aspect-video w-full"}>
                        <iframe
                            src={embed}
                            className="w-full h-full"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                ) : (
                    <div className="aspect-video w-full flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Unable to embed this URL.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
