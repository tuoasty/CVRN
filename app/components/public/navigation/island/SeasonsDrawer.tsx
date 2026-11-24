"use client";

import Link from "next/link";
import type {MouseEvent} from "react";
import {useParams, usePathname} from "next/navigation";
import {cn} from "@/lib/utils";
import {useRegions} from "@/app/hooks/useRegions";
import {useSeasons} from "@/app/hooks/useSeasons";
import {isSeasonActive} from "@/server/domains/season/helpers/isSeasonActive";
import {contextHref, seasonGroupsFor, type IslandRegionCode} from "./islandContext";
import {DRAWER_HEADING, drawerLabelClass, drawerRowClass, rowStyle, type DrawerSize} from "./IslandDrawer";

export function SeasonsDrawer({island, size, onPick}: {island: IslandRegionCode; size: DrawerSize; onPick(event: MouseEvent<HTMLAnchorElement>): void}) {
    const {regions} = useRegions();
    const {seasons} = useSeasons();
    const pathname = usePathname();
    const params = useParams<{region?: string; season?: string}>();
    const current = params.region && params.season ? {region: params.region, season: params.season} : null;

    const groups = seasonGroupsFor(island, regions, seasons);
    const total = groups.reduce((n, group) => n + group.seasons.length, 0);
    let index = 0;

    return (
        <>
            <div className={cn("scrollbar-quiet overflow-y-auto py-1.5", size === "desktop" ? "max-h-[264px]" : "max-h-[308px]")}>
                {groups.map((group, groupIndex) => (
                    <div key={group.regionCode}>
                        <p className={DRAWER_HEADING} style={rowStyle(index++)}>{group.regionName}</p>
                        {group.seasons.map((season, seasonIndex) => {
                            const isCurrent = season.slug === params.season && group.regionCode.toLowerCase() === params.region?.toLowerCase();
                            return (
                                <Link
                                    key={season.id}
                                    href={contextHref(group.regionCode, season.slug, pathname, current)}
                                    aria-current={isCurrent ? "page" : undefined}
                                    onClick={onPick}
                                    className={drawerRowClass(size, isCurrent)}
                                    style={rowStyle(index++)}
                                >
                                    <span className={drawerLabelClass(isCurrent)}>{season.name}</span>
                                    {groupIndex === 0 && seasonIndex === 0 && isSeasonActive(season) && (
                                        <span className="text-xs font-medium text-muted-foreground">Current</span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div
                className={cn(
                    "island-row flex items-center justify-between border-t border-border px-3.5 text-xs text-muted-foreground",
                    size === "desktop" ? "h-10" : "h-11",
                )}
            >
                <span className="font-mono tabular-nums">{total} seasons</span>
                <Link href="/archive" onClick={onPick} className="text-foreground underline underline-offset-4">
                    Archive
                </Link>
            </div>
        </>
    );
}
