"use client"

import { useState } from "react"
import Image from "next/image"
import { User } from "lucide-react"

/**
 * Roblox avatar-headshot rendered as a free-floating bust: transparent PNG, no container,
 * bottom-anchored so the shoulders sit flush with the row's bottom edge and the head rises
 * above the text. Falls back to a small glyph chip when the thumbnail is missing.
 */
export default function PlayerAvatar({ src, alt }: { src: string | null | undefined; alt: string }) {
    const [errored, setErrored] = useState(false)

    if (!src || errored) {
        return (
            <div className="flex h-full w-full items-end justify-center">
                <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                </span>
            </div>
        )
    }

    return (
        <Image
            src={src}
            alt={alt}
            fill
            sizes="52px"
            className="object-contain object-bottom"
            unoptimized
            onError={() => setErrored(true)}
        />
    )
}
