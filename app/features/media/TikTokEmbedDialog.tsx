"use client"

import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'

function parseVideoId(html: string): string | null {
    return html.match(/data-video-id="(\d+)"/)?.[1] ?? null
}

interface TikTokEmbedDialogProps {
    embedHtml: string
    open: boolean
    onOpenChange: (v: boolean) => void
}

export default function TikTokEmbedDialog({ embedHtml, open, onOpenChange }: TikTokEmbedDialogProps) {
    const videoId = parseVideoId(embedHtml)

    // TikTok portrait player including header/footer chrome is ~9:20 (width × 2.25 = height)
    // Width: min(325px TikTok min, 92vw); Height: proportional, capped to 90dvh
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="p-0 border-border rounded-xl overflow-hidden"
                style={{ width: 'min(325px, 92vw)', backgroundColor: 'black' }}
            >
                <DialogHeader className="sr-only">
                    <DialogTitle>TikTok Clip</DialogTitle>
                </DialogHeader>

                <div className="relative">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute top-2 right-2 z-10 rounded-full bg-black/60 backdrop-blur-sm p-1.5 text-white hover:bg-black/80 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {videoId ? (
                        <iframe
                            src={`https://www.tiktok.com/embed/v2/${videoId}`}
                            allowFullScreen
                            allow="encrypted-media"
                            className="block border-0"
                            style={{
                                width: 'min(325px, 92vw)',
                                height: 'min(calc(min(325px, 92vw) * 2.25), 90dvh)',
                            }}
                        />
                    ) : (
                        <div
                            className="flex items-center justify-center text-sm text-muted-foreground"
                            style={{ width: 'min(325px, 92vw)', height: '400px' }}
                        >
                            Unable to load TikTok clip.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
