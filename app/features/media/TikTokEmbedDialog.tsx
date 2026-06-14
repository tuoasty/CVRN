"use client"

import { useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'

const SCRIPT_SRC = 'https://www.tiktok.com/embed.js'

function safeTikTokUrl(raw: string | null): string | null {
    if (!raw) return null
    try {
        const u = new URL(raw)
        const host = u.hostname.toLowerCase().replace(/\.$/, '')
        if (u.protocol !== 'https:' || (host !== 'tiktok.com' && !host.endsWith('.tiktok.com'))) return null
        return u.toString()
    } catch { return null }
}

function parseEmbedHtml(html: string): { videoId: string | null; citeUrl: string | null } {
    return {
        videoId: html.match(/data-video-id="(\d+)"/)?.[1] ?? null,
        citeUrl: safeTikTokUrl(html.match(/cite="([^"]+)"/)?.[1] ?? null),
    }
}

interface TikTokEmbedDialogProps {
    embedHtml: string
    open: boolean
    onOpenChange: (v: boolean) => void
}

export default function TikTokEmbedDialog({ embedHtml, open, onOpenChange }: TikTokEmbedDialogProps) {
    const { videoId, citeUrl } = parseEmbedHtml(embedHtml)

    useEffect(() => {
        if (!open || !videoId) return
        const script = document.createElement('script')
        script.src = SCRIPT_SRC
        script.async = true
        document.body.appendChild(script)
        return () => { document.body.removeChild(script) }
    }, [open, videoId])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-auto max-w-[95vw] p-0 border-none bg-transparent shadow-none overflow-hidden [&>button]:hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>TikTok Clip</DialogTitle>
                </DialogHeader>
                {videoId && citeUrl ? (
                    <div className="rounded-xl overflow-hidden">
                        <blockquote
                            className="tiktok-embed"
                            cite={citeUrl}
                            data-video-id={videoId}
                            data-embed-from="oembed"
                            data-theme="dark"
                            style={{ maxWidth: '605px', minWidth: '325px', margin: 0, border: 'none' }}
                        >
                            <section />
                        </blockquote>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
