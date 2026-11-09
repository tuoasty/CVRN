"use client";

import Image from "next/image";
import {useRef} from "react";
import {cn} from "@/lib/utils";
import {TeamMark} from "../sections/TeamMark";
import type {HeroItem, HomeTeam} from "../model/types";

function tag(item: HeroItem): string | null {
    if (item.kind === "potw") return "POTW";
    if (item.kind === "totw") return "TOTW";
    if (item.kind === "champion") return "Champion";
    return null;
}

function subject(item: HeroItem): HomeTeam | null {
    if (item.kind === "champion") return item.champion;
    if (item.kind === "match") return item.home;
    return item.team;
}

function describe(item: HeroItem): string {
    if (item.kind === "match") return `${item.label}, ${item.home.name} vs ${item.away.name}`;
    if (item.kind === "potw") return `${item.label}, ${item.player.name}`;
    if (item.kind === "totw") return `${item.label}, ${item.team?.name ?? ""}`;
    return `Champions, ${item.champion.name}`;
}

export function HeroThumbs({items, selected, onSelect, className}: {
    items: HeroItem[];
    selected: number;
    onSelect: (index: number) => void;
    className?: string;
}) {
    const refs = useRef<(HTMLButtonElement | null)[]>([]);
    if (items.length < 2) return null;

    const move = (to: number) => {
        const next = (to + items.length) % items.length;
        onSelect(next);
        refs.current[next]?.focus();
    };

    return (
        <div
            className={cn("flex gap-2 overflow-x-auto pb-1", className)}
            role="group"
            aria-label="Featured"
            onKeyDown={e => {
                if (e.key === "ArrowRight") { e.preventDefault(); move(selected + 1); }
                if (e.key === "ArrowLeft") { e.preventDefault(); move(selected - 1); }
            }}
        >
            {items.map((item, i) => {
                const label = tag(item);
                const on = i === selected;
                return (
                    <button
                        key={item.key}
                        ref={el => { refs.current[i] = el; }}
                        type="button"
                        aria-pressed={on}
                        aria-label={describe(item)}
                        onClick={() => onSelect(i)}
                        className={cn(
                            "shrink-0 text-left transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                            on ? "opacity-100" : "opacity-60 hover:opacity-80",
                        )}
                    >
                        {item.image ? (
                            <Image
                                src={item.image.imageUrl}
                                alt=""
                                width={0}
                                height={0}
                                sizes="240px"
                                className="h-24 w-auto max-w-none"
                            />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center">
                                {subject(item) && <TeamMark team={subject(item) as HomeTeam} size={72} />}
                            </div>
                        )}
                        <div className={cn("mt-1.5 h-0.5", on ? "bg-foreground" : "bg-transparent")} />
                        {label && <div className={cn("mt-1 font-mono text-[11px] uppercase tracking-wider", on ? "font-semibold" : "text-muted-foreground")}>{label}</div>}
                    </button>
                );
            })}
        </div>
    );
}
