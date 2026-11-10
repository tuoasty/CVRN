"use client";

import { useState } from "react";
import Image from "next/image";
import GFXImageDialog from "@/app/features/media/GFXImageDialog";
import VideoEmbedDialog from "@/app/features/media/VideoEmbedDialog";
import { resolveMediaThumbnail } from "@/app/features/media/mediaUtils";
import { SectionHeading } from "@/app/(public)/home/sections/SectionHeading";
import { MEDIA_ROW_HEIGHT } from "@/app/(public)/home/model/fitThumbs";
import { postRatio } from "@/app/(public)/home/model/ratio";
import { mediaOpenKind, mediaSubline } from "@/app/features/teams/detail/model/teamMedia";
import type { MediaPost } from "@/server/domains/media/types";

const INITIAL = 6;

type Tile = { post: MediaPost; imageUrl: string; ratio: number; video: boolean };

function toTiles(posts: MediaPost[]): Tile[] {
    return posts.flatMap((post) => {
        const imageUrl = resolveMediaThumbnail(post.image_url, post.video_url);
        if (!imageUrl) return [];
        const video = mediaOpenKind(post) === "video";
        return [{ post, imageUrl, ratio: video ? 16 / 9 : postRatio(post), video }];
    });
}

export default function TeamMediaSection({ posts }: { posts: MediaPost[] }) {
    const [showAll, setShowAll] = useState(false);
    const [open, setOpen] = useState<Tile | null>(null);

    const tiles = toTiles(posts);
    if (tiles.length === 0) return null;
    const visible = showAll ? tiles : tiles.slice(0, INITIAL);

    return (
        <section aria-label="Media" className="min-w-0">
            <SectionHeading title="Media">
                {tiles.length > INITIAL && (
                    <button
                        type="button"
                        onClick={() => setShowAll((v) => !v)}
                        className="text-xs font-semibold underline underline-offset-4 hover:decoration-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                    >
                        {showAll ? "Show fewer" : `Show all ${tiles.length}`}
                    </button>
                )}
            </SectionHeading>
            <div className="mt-3 flex flex-wrap gap-2">
                {visible.map((tile) => {
                    const caption = `${tile.post.title} · ${mediaSubline(tile.post)}`;
                    return (
                        <button
                            key={tile.post.id}
                            type="button"
                            onClick={() => setOpen(tile)}
                            aria-label={caption}
                            className="group relative h-[190px] min-w-0 cursor-pointer overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                            style={{ flexGrow: tile.ratio, flexBasis: tile.ratio * MEDIA_ROW_HEIGHT }}
                        >
                            <Image
                                src={tile.imageUrl}
                                alt=""
                                fill
                                sizes={`${Math.round(tile.ratio * MEDIA_ROW_HEIGHT * 1.5)}px`}
                                className="object-cover"
                                unoptimized={tile.video}
                            />
                            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-left text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                <span className="block truncate">{tile.post.title}</span>
                                <span className="block truncate text-white/70">{mediaSubline(tile.post)}</span>
                            </span>
                        </button>
                    );
                })}
                <span aria-hidden className="flex-grow-[999]" />
            </div>

            {open && !open.video && (
                <GFXImageDialog url={open.imageUrl} title={open.post.title} open onOpenChange={(o) => !o && setOpen(null)} />
            )}
            {open?.video && open.post.video_url && (
                <VideoEmbedDialog url={open.post.video_url} open onOpenChange={(o) => !o && setOpen(null)} />
            )}
        </section>
    );
}
