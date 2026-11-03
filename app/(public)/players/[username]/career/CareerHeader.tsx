"use client";

import type {MouseEvent} from "react";
import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {isPlayerBehind} from "@/app/features/player/detail/careerBack";
import {useStickyOffset} from "@/app/hooks/useStickyOffset";

const NAV_LINK = "font-medium text-foreground hover:underline";

function jumpToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView();
    window.history.replaceState(window.history.state, "", `#${id}`);
}

type NavigationEntries = {
    entries: () => {url: string | null}[];
    currentEntry: {index: number} | null;
};

function playerIsPreviousEntry(playerHref: string): boolean {
    const navigation = (window as unknown as {navigation?: NavigationEntries}).navigation;
    if (!navigation?.currentEntry) return false;
    const urls = navigation.entries().map(entry => entry.url ?? window.location.origin);
    return isPlayerBehind(urls, navigation.currentEntry.index, playerHref);
}

export function CareerHeader({name, username, avatarUrl, playerHref, sections}: {
    name: string;
    username: string | null;
    avatarUrl: string | null;
    playerHref: string | null;
    sections: {id: string; label: string}[];
}) {
    const top = useStickyOffset();
    const router = useRouter();

    const goBack = (event: MouseEvent<HTMLAnchorElement>) => {
        if (!playerHref || !playerIsPreviousEntry(playerHref)) return;
        event.preventDefault();
        router.back();
    };

    return (
        <div
            className="sticky z-40 -mx-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border bg-background px-4 py-2"
            style={{top}}
        >
            <nav aria-label="Career" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:gap-x-6">
                {playerHref && <Link href={playerHref} replace prefetch={false} onClick={goBack} className={NAV_LINK}>Back</Link>}
                {sections.map(section => (
                    <a key={section.id} href={`#${section.id}`} onClick={event => jumpToSection(event, section.id)} className={NAV_LINK}>{section.label}</a>
                ))}
            </nav>
            <div className="flex min-w-0 items-center gap-3">
                <span className="relative block size-10 shrink-0">
                    {avatarUrl && (
                        <Image src={avatarUrl} alt={username ?? ""} fill sizes="40px" className="object-contain" unoptimized />
                    )}
                </span>
                <div className="min-w-0">
                    <h1 className="truncate text-sm font-semibold leading-tight">{name}</h1>
                    {username && <p className="truncate text-xs text-muted-foreground">@{username}</p>}
                </div>
            </div>
        </div>
    );
}
