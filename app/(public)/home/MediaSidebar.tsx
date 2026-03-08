"use client";

import { Image as ImageIcon } from "lucide-react";

export default function MediaSidebar() {
    return (
        <div className="space-y-3">
            <div className="panel p-4 bg-gradient-to-br from-muted/30 to-transparent min-h-[200px]">
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    <h4 className="text-xs font-bold text-muted-foreground">
                        Media
                    </h4>
                    <p className="text-[10px] text-muted-foreground/70 text-center">
                        Match highlights coming soon
                    </p>
                </div>
            </div>
        </div>
    );
}