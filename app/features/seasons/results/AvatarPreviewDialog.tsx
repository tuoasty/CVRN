"use client";

import Image from "next/image";
import {Loader2} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/app/components/ui/dialog";
import {Button} from "@/app/components/ui/button";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    playerName: string;
    cdnUrl: string;
    onConfirm: () => Promise<void>;
    confirming: boolean;
}

export function AvatarPreviewDialog({open, onOpenChange, playerName, cdnUrl, onConfirm, confirming}: Props) {
    return (
        <Dialog open={open} onOpenChange={o => { if (!confirming) onOpenChange(o); }}>
            <DialogContent className="max-w-xs rounded-sm">
                <DialogHeader>
                    <DialogTitle>Replace avatar</DialogTitle>
                    <DialogDescription>
                        Current Roblox avatar for <span className="font-semibold text-foreground">@{playerName}</span>. Saving replaces the stored image.
                    </DialogDescription>
                </DialogHeader>
                <div className="relative mx-auto aspect-[3/4] w-32 overflow-hidden bg-muted">
                    <Image src={cdnUrl} alt={`Roblox avatar of ${playerName}`} fill sizes="128px" unoptimized className="object-cover object-top" />
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" size="sm" className="rounded-md" disabled={confirming} onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button size="sm" className="rounded-md" disabled={confirming} onClick={onConfirm}>
                        {confirming && <Loader2 className="animate-spin motion-reduce:animate-none" />}
                        Replace avatar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
