'use client';

import {ReactNode} from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {cn} from '@/lib/utils';

interface Props {
    open: boolean;
    title: string;
    description: ReactNode;
    cancelLabel: string;
    confirmLabel: string;
    destructive?: boolean;
    busy?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function ConfirmDialog({
    open,
    title,
    description,
    cancelLabel,
    confirmLabel,
    destructive,
    busy,
    onCancel,
    onConfirm,
}: Props) {
    return (
        <AlertDialog open={open} onOpenChange={o => !o && !busy && onCancel()}>
            <AlertDialogContent className="rounded-sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-sm" disabled={busy}>
                        {cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={busy}
                        onClick={e => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        className={cn('rounded-sm', destructive && 'bg-destructive text-white hover:bg-destructive/90')}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
