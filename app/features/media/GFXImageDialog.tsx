"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'

interface GFXImageDialogProps {
    url: string
    title: string
    open: boolean
    onOpenChange: (v: boolean) => void
}

export default function GFXImageDialog({ url, title, open, onOpenChange }: GFXImageDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl sm:max-w-5xl w-[95vw] p-0 overflow-hidden rounded-sm border-border bg-black">
                <DialogHeader className="sr-only">
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={url}
                    alt={title}
                    className="max-h-[85vh] w-full object-contain"
                />
            </DialogContent>
        </Dialog>
    )
}
