"use client";

import {useState} from "react";
import {cn} from "@/lib/utils";
import {GfxFrame, HERO_ROW_HEIGHT, PORTRAIT_MAX_RATIO} from "./GfxFrame";
import {TapeCard} from "./TapeCard";
import {HeroThumbs} from "./HeroThumbs";
import {ChampionLockup} from "./ChampionLockup";
import type {HeroItem} from "../model/types";

export function HeroSection({items, seasonLabel}: {items: HeroItem[]; seasonLabel: string}) {
    const [selected, setSelected] = useState(0);
    if (items.length === 0) return null;
    const index = Math.min(selected, items.length - 1);
    const item = items[index];
    const thumbs = <HeroThumbs items={items} selected={index} onSelect={setSelected} className="mt-4" />;

    if (item.kind === "champion" && !item.image) {
        return (
            <section aria-label="Featured" className="page-wide mt-5">
                <div className={HERO_ROW_HEIGHT}>
                    <ChampionLockup item={item} seasonLabel={seasonLabel} />
                </div>
                {thumbs}
            </section>
        );
    }

    const portrait = !!item.image && item.image.ratio < PORTRAIT_MAX_RATIO;

    return (
        <section aria-label="Featured" className="page-wide mt-5">
            <div className={cn("flex flex-col gap-6 lg:flex-row lg:gap-10", HERO_ROW_HEIGHT, portrait && "lg:justify-center")}>
                {item.image && <GfxFrame key={item.key} image={item.image} priority={index === 0} />}
                <div className={cn("min-w-0 flex-1 lg:overflow-y-auto", portrait && "lg:max-w-[560px]")}>
                    <TapeCard item={item} />
                </div>
            </div>
            {thumbs}
        </section>
    );
}
