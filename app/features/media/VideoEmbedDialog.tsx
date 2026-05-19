"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'

function toEmbedUrl(url: string): string | null {
    try {
        const u = new URL(url)
        if (u.hostname.includes('youtube.com')) {
            const v = u.searchParams.get('v')
            return v ? `https://www.youtube.com/embed/${v}` : null
        }
        if (u.hostname.includes('youtu.be')) {
            return `https://www.youtube.com/embed${u.pathname}`
        }
        if (u.hostname.includes('twitch.tv')) {
            const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const channel = u.pathname.replace(/^\/videos\//, '')
            const isVod = u.pathname.startsWith('/videos/')
            return isVod
                ? `https://player.twitch.tv/?video=${channel}&parent=${parent}`
                : `https://player.twitch.tv/?channel=${channel}&parent=${parent}`
        }
        return url
    } catch {
        return null
    }
}

interface VideoEmbedDialogProps {
    url: string
    open: boolean
    onOpenChange: (v: boolean) => void
}

export default function VideoEmbedDialog({ url, open, onOpenChange }: VideoEmbedDialogProps) {
    const embed = toEmbedUrl(url)
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-sm border-border bg-black">
                <DialogHeader className="sr-only">
                    <DialogTitle>Video Player</DialogTitle>
                </DialogHeader>
                {embed ? (
                    <div className="aspect-video w-full">
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
