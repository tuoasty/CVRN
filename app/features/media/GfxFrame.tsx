import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
    src: string;
    alt: string;
    /** Sizes for the foreground copy only; the blur layer always requests a tiny source. */
    sizes: string;
    priority?: boolean;
    className?: string;
};

/**
 * Renders a graphic without ever cropping it. A GFX is someone else's artwork and its aspect ratio
 * is unknown — `media_posts` stores no width/height — so a portrait poster in the 2.04:1 home card
 * loses ~78% of its height to `object-cover`. Contain plus a blurred copy of the same image fills
 * the gap with colours that can never clash, and behaves identically for 16:9, 1:1 and 9:16 with no
 * branching. On a 16:9 source the fill is a barely-visible sliver.
 */
export default function GfxFrame({ src, alt, sizes, priority = false, className }: Props) {
    return (
        <div className={cn("relative overflow-hidden", className)}>
            {/* A 28px blur of a 64px source is indistinguishable from a blur of a 1200px one, and
                it is the same `src`, so this costs no extra request. scale prevents edge bleed. */}
            <Image
                src={src}
                alt=""
                aria-hidden
                fill
                sizes="64px"
                className="object-cover scale-[1.15] blur-[28px] saturate-125 opacity-85"
            />
            {/* Holds overlay text contrast when the artwork is bright. */}
            <div className="absolute inset-0 bg-black/25" />
            <Image
                src={src}
                alt={alt}
                fill
                priority={priority}
                sizes={sizes}
                className="object-contain"
            />
        </div>
    );
}
