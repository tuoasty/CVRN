"use client";

import { useState } from "react";
import { Image as ImageIcon, Plus } from "lucide-react";
import CreateMediaPostDialog from "@/app/features/media/CreateMediaPostDialog";
import EditMediaPostDialog from "@/app/features/media/EditMediaPostDialog";
import type { MediaPost } from "@/server/domains/media";
import { cn } from "@/lib/utils";

interface RoundMediaSpotProps {
    type: "potw" | "totw";
    seasonId: string;
    roundKey: string;
    post: MediaPost | null;
    onChanged: () => void;
}

export default function RoundMediaSpot({ type, seasonId, roundKey, post, onChanged }: RoundMediaSpotProps) {
    const [open, setOpen] = useState(false);
    const label = type === "potw" ? "POTW" : "TOTW";
    const Icon = post ? ImageIcon : Plus;

    return (
        <>
            <button
                type="button"
                title={post ? post.title : `Add ${label}`}
                onClick={() => setOpen(true)}
                className={cn(
                    "inline-flex items-center gap-1 rounded-sm text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    post ? "font-semibold text-primary hover:text-primary/80" : "font-medium text-muted-foreground hover:text-foreground"
                )}
            >
                <Icon aria-hidden className="h-3 w-3" />
                {label}
            </button>

            {open && (post ? (
                <EditMediaPostDialog post={post} open onOpenChange={setOpen} onSaved={onChanged} />
            ) : (
                <CreateMediaPostDialog
                    open
                    onOpenChange={setOpen}
                    lockedType={type}
                    seasonId={seasonId}
                    roundKey={roundKey}
                    onCreated={onChanged}
                />
            ))}
        </>
    );
}
