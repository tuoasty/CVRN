import Image from "next/image";
import {cn} from "@/lib/utils";
import {getLogoClassName} from "@/app/lib/logoClass";
import {DefaultTeamLogo} from "@/app/components/ui/DefaultTeamLogo";
import type {HomeTeam} from "../model/types";

const SIZE_CLASS = {
    24: "h-6 w-6",
    40: "h-10 w-10",
    56: "h-14 w-14",
    64: "h-16 w-16",
    72: "h-[72px] w-[72px]",
    240: "h-40 w-40 lg:h-60 lg:w-60",
} as const;

export function TeamMark({team, size, className}: {team: HomeTeam; size: keyof typeof SIZE_CLASS; className?: string}) {
    const sizes = `${size}px`;
    return (
        <div className={cn("relative shrink-0", SIZE_CLASS[size], className)}>
            {team.logoUrl ? (
                <Image src={team.logoUrl} alt="" fill sizes={sizes} className={getLogoClassName(team.logoBgRemoved)} />
            ) : (
                <DefaultTeamLogo sizes={sizes} />
            )}
        </div>
    );
}

export function PlayerAvatar({src, size}: {src: string | null; size: 22 | 28 | 40}) {
    const cls = size === 22 ? "h-[22px] w-[22px]" : size === 28 ? "h-7 w-7" : "h-10 w-10";
    return (
        <div className={cn("relative shrink-0", cls)}>
            {src && <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />}
        </div>
    );
}

export function TodayMark({children}: {children: React.ReactNode}) {
    return (
        <span className="inline-flex items-center gap-1.5 font-semibold">
            <span aria-hidden className="hidden h-[7px] w-[7px] rounded-full bg-today dark:inline-block" />
            <span className="bg-today px-1 text-black dark:bg-transparent dark:px-0 dark:text-today">{children}</span>
        </span>
    );
}
