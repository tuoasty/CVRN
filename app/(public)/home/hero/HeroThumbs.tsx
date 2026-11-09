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
        <div className={cn("[container-type:inline-size]", className)}>
        <div
            className="flex gap-2 overflow-x-auto pb-1 lg:overflow-visible lg:[--th:calc((100cqw_-_48px)*9/112)]"
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
                const ratio = item.image?.ratio ?? 1;
                return (
                    <button
                        key={item.key}
                        ref={el => { refs.current[i] = el; }}
                        type="button"
                        aria-pressed={on}
                        aria-label={describe(item)}
                        onClick={() => onSelect(i)}
                        style={{"--r": ratio} as React.CSSProperties}
                        className={cn(
                            "shrink-0 text-left transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:w-[calc(var(--th)*var(--r))] lg:min-w-0 lg:shrink",
                            on ? "opacity-100" : "opacity-60 hover:opacity-80",
                        )}
                    >
                        <div className="relative flex h-24 w-[calc(96px*var(--r))] items-center justify-center lg:h-[var(--th)] lg:w-full">
                            {item.image ? (
                                <Image src={item.image.imageUrl} alt="" fill sizes="240px" className="object-contain" />
                            ) : (
                                subject(item) && <TeamMark team={subject(item) as HomeTeam} size={72} />
                            )}
                        </div>
                        <div className={cn("mt-1.5 h-0.5", on ? "bg-foreground" : "bg-transparent")} />
                        <div className={cn("mt-1 h-4 font-mono text-[11px] uppercase leading-4 tracking-wider", on ? "font-semibold" : "text-muted-foreground")}>{label}</div>
                    </button>
                );
            })}
        </div>
        </div>
    );
}
