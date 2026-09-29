"use client";

import Image from "next/image";
import Link from "next/link";
import GfxFrame from "@/app/features/media/GfxFrame";
import { cn } from "@/lib/utils";
import { buildPublicTeamHref } from "@/app/utils/matchDetailHref";
import type { SeasonPodiumEntryWithTeam } from "@/server/domains/season";
import type { MediaPost } from "@/server/domains/media";

const LOGO_SHADOW =
    "[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.65))_drop-shadow(0_1px_3px_rgba(0,0,0,0.85))]";

const CHAMPION_SCRIM =
    "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent 18%), linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.30) 12%, transparent 30%)";

interface SeasonChampionGfxCardProps {
    gfx: MediaPost;
    podium: SeasonPodiumEntryWithTeam[];
    authorName?: string | null;
    seasonName?: string;
    regionCode?: string;
    seasonSlug?: string;
}

export default function SeasonChampionGfxCard({
    gfx,
    podium,
    authorName,
    seasonName,
    regionCode,
    seasonSlug,
}: SeasonChampionGfxCardProps) {
    const champion = [...podium].sort((a, b) => a.place - b.place).find((e) => e.place === 1);
    const href = champion
        ? buildPublicTeamHref({ regionCode, seasonSlug, teamSlug: champion.teams.slug })
        : null;

    return (
        <div className="panel relative w-full overflow-hidden aspect-video sm:min-h-[280px] bg-black transition-colors hover:border-primary/60">
            <div className="absolute inset-0 flex">
                <GfxFrame src={gfx.image_url!} alt={gfx.title} priority sizes="768px" className="flex-none w-full h-full" />
            </div>

            <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: CHAMPION_SCRIM }} />

            {href && (
                <Link
                    href={href}
                    prefetch={false}
                    className="absolute inset-0 z-20"
                    aria-label={champion?.teams.name ?? "Season Champion"}
                />
            )}

            <div className="absolute inset-0 z-30 pointer-events-none">
                <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-5 py-4">
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-white">
                        Champion
                    </h3>
                    {seasonName && (
                        <span className="hidden sm:block text-[13px] font-semibold uppercase tracking-wider text-white/75">
                            {seasonName}
                        </span>
                    )}
                </div>

                <div className="absolute inset-x-0 bottom-0 px-5 pt-12 pb-4">
                    <div className="flex h-10 items-center gap-3">
                        {champion?.teams.logo_url && (
                            <div className="relative w-11 h-11 shrink-0">
                                <Image
                                    src={champion.teams.logo_url}
                                    alt={champion.teams.name}
                                    fill
                                    sizes="44px"
                                    className={cn("object-contain", LOGO_SHADOW)}
                                />
                            </div>
                        )}
                        {champion && (
                            <div className="min-w-0">
                                <span className="block text-lg font-bold text-white truncate">
                                    {champion.teams.name}
                                </span>
                            </div>
                        )}
                        {authorName && (
                            <span className="hidden sm:block shrink-0 ml-auto text-xs text-white/60 truncate max-w-[220px]">
                                <span className="uppercase tracking-wider">by {authorName}</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
