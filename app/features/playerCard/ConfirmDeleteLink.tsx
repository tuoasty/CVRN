'use client'

import { useState } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'

const DANGER_LINK = 'text-xs text-destructive hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40 disabled:no-underline'

export default function ConfirmDeleteLink({ label, title, description, onConfirm }: {
    label: string
    title: string
    description: string
    onConfirm: () => Promise<boolean>
}) {
    const [open, setOpen] = useState(false)
    const [busy, setBusy] = useState(false)

    async function handleConfirm(e: React.MouseEvent) {
        e.preventDefault()
        setBusy(true)
        try {
            if (await onConfirm()) setOpen(false)
        } finally {
            setBusy(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <button type="button" className={DANGER_LINK}>{label}</button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy} className="rounded-sm">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={busy}
                        className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {busy ? 'Deleting…' : label}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
