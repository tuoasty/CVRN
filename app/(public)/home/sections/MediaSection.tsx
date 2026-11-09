"use client";

import {useState} from "react";
import Image from "next/image";
import GFXImageDialog from "@/app/features/media/GFXImageDialog";
import VideoEmbedDialog from "@/app/features/media/VideoEmbedDialog";
import {SectionHeading} from "./SectionHeading";
import {MEDIA_ROW_HEIGHT} from "../model/fitThumbs";
import type {HomeView, MediaTile} from "../model/types";

export function MediaSection({tiles, href}: HomeView["media"]) {
    const [open, setOpen] = useState<MediaTile | null>(null);
    if (tiles.length === 0) return null;
    return (
        <section aria-label="Media">
            <SectionHeading title="Media" href={href} linkLabel="View all" />
            <div className="mt-3 flex flex-wrap gap-2">
                {tiles.map(tile => (
                    <button
                        key={tile.postId}
                        type="button"
                        onClick={() => setOpen(tile)}
                        aria-label={[tile.regionCode, tile.caption].filter(Boolean).join(" · ")}
                        className="group relative h-[190px] overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                        style={{flexGrow: tile.ratio, flexBasis: tile.ratio * MEDIA_ROW_HEIGHT}}
                    >
                        <Image src={tile.imageUrl} alt="" fill sizes={`${Math.round(tile.ratio * MEDIA_ROW_HEIGHT * 1.5)}px`} className="object-cover" unoptimized={!!tile.videoUrl} />
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-left text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            {tile.regionCode && <span className="font-mono text-[10px] text-white/70">{tile.regionCode}</span>}
                            <span className="truncate">{tile.caption}</span>
                        </span>
                    </button>
                ))}
                <span aria-hidden className="flex-grow-[999] min-[1440px]:hidden" />
            </div>
            {open && !open.videoUrl && (
                <GFXImageDialog url={open.imageUrl} title={open.caption} open onOpenChange={o => !o && setOpen(null)} />
            )}
            {open?.videoUrl && <VideoEmbedDialog url={open.videoUrl} open onOpenChange={o => !o && setOpen(null)} />}
        </section>
    );
}
