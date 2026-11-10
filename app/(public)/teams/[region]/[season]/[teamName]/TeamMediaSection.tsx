"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import GFXImageDialog from "@/app/features/media/GFXImageDialog";
import VideoEmbedDialog from "@/app/features/media/VideoEmbedDialog";
import { resolveMediaThumbnail } from "@/app/features/media/mediaUtils";
import { SectionHeading } from "@/app/(public)/home/sections/SectionHeading";
import { MEDIA_ROW_HEIGHT } from "@/app/(public)/home/model/fitThumbs";
import { postRatio } from "@/app/(public)/home/model/ratio";
import { mediaOpenKind, mediaSubline } from "@/app/features/teams/detail/model/teamMedia";
import { packRows } from "@/app/features/teams/detail/model/packRows";
import type { MediaPost } from "@/server/domains/media/types";

const GAP = 8;

type Tile = { post: MediaPost; imageUrl: string; ratio: number; video: boolean };

function toTiles(posts: MediaPost[]): Tile[] {
    return posts.flatMap((post) => {
        const imageUrl = resolveMediaThumbnail(post.image_url, post.video_url);
        if (!imageUrl) return [];
        const video = mediaOpenKind(post) === "video";
        return [{ post, imageUrl, ratio: video ? 16 / 9 : postRatio(post), video }];
    });
}

function MediaTile({ tile, onOpen }: { tile: Tile; onOpen: (tile: Tile) => void }) {
    const caption = `${tile.video ? "Play video: " : ""}${tile.post.title} · ${mediaSubline(tile.post)}`;
    return (
        <button
            type="button"
            onClick={() => onOpen(tile)}
            aria-label={caption}
            className="group relative max-w-full shrink-0 cursor-pointer overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            style={{ width: tile.ratio * MEDIA_ROW_HEIGHT, aspectRatio: tile.ratio }}
        >
            <Image
                src={tile.imageUrl}
                alt=""
                fill
                sizes={`${Math.round(tile.ratio * MEDIA_ROW_HEIGHT * 1.5)}px`}
                className="object-cover"
                unoptimized={tile.video}
            />
            {tile.video && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white"
                >
                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                </span>
            )}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-left text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="block truncate">{tile.post.title}</span>
                <span className="block truncate text-white/70">{mediaSubline(tile.post)}</span>
            </span>
        </button>
    );
}

export default function TeamMediaSection({ posts }: { posts: MediaPost[] }) {
    const [open, setOpen] = useState<Tile | null>(null);
    const [width, setWidth] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const tiles = useMemo(() => toTiles(posts), [posts]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const rows = useMemo(() => {
        if (width === null) return null;
        return packRows(
            tiles.map((t) => Math.min(t.ratio * MEDIA_ROW_HEIGHT, width)),
            width,
            GAP,
        );
    }, [tiles, width]);

    if (tiles.length === 0) return null;

    return (
        <section aria-label="Media" className="min-w-0">
            <SectionHeading title="Media" />
            <div ref={containerRef} className="mt-3">
                {rows ? (
                    <div className="flex flex-col gap-2">
                        {rows.map((row) => (
                            <div key={row.map((i) => tiles[i].post.id).join("-")} className="flex gap-2">
                                {row.map((i) => (
                                    <MediaTile key={tiles[i].post.id} tile={tiles[i]} onOpen={setOpen} />
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {tiles.map((tile) => (
                            <MediaTile key={tile.post.id} tile={tile} onOpen={setOpen} />
                        ))}
                    </div>
                )}
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
