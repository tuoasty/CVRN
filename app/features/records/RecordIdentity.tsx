import Image from "next/image";
import Link from "next/link";
import {Shield} from "lucide-react";
import {cn} from "@/lib/utils";
import {getLogoClassName} from "@/app/lib/logoClass";
import type {RecordEntry} from "@/server/domains/record";
import {recordEntryHref, recordEntryName} from "./recordContext";

export const ROW_LINK =
    "hover:underline underline-offset-[3px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

const LOGO_SIZE = {24: "size-6", 28: "size-7", 40: "size-10"} as const;

const LOGO_BACKDROP =
    "object-contain drop-shadow-[0_0_1px_rgba(0,0,0,0.35)] dark:drop-shadow-[0_0_1px_rgba(255,255,255,0.35)]";

function logoClass(bgRemoved: boolean): string {
    return bgRemoved ? getLogoClassName(true) : LOGO_BACKDROP;
}

export function TeamLogo({
    team,
    size,
    label,
    className,
}: {
    team: RecordEntry["team"];
    size: keyof typeof LOGO_SIZE;
    label?: string;
    className?: string;
}) {
    return (
        <span
            role={label ? "img" : undefined}
            aria-label={label}
            title={label}
            className={cn("relative block shrink-0", LOGO_SIZE[size], className)}
        >
            {team?.logoUrl ? (
                <Image
                    src={team.logoUrl}
                    alt=""
                    fill
                    sizes={`${size}px`}
                    className={logoClass(team.logoBgRemoved)}
                    unoptimized
                />
            ) : (
                <>
                    <Image
                        src="/default-team-light.png"
                        alt=""
                        fill
                        sizes={`${size}px`}
                        className={cn(LOGO_BACKDROP, "dark:hidden")}
                    />
                    <Image
                        src="/default-team-dark.png"
                        alt=""
                        fill
                        sizes={`${size}px`}
                        className={cn(LOGO_BACKDROP, "hidden dark:block")}
                    />
                </>
            )}
        </span>
    );
}

export function RecordAvatar({entry, size, className}: {entry: RecordEntry; size: 24 | 40; className?: string}) {
    if (entry.subject === "team") return <TeamLogo team={entry.team} size={size} className={className} />;
    return (
        <span
            className={cn(
                "relative block shrink-0 overflow-hidden rounded-full bg-muted",
                size === 40 ? "size-10" : "size-6",
                className,
            )}
        >
            {entry.player?.avatarUrl && (
                <Image src={entry.player.avatarUrl} alt="" fill sizes={`${size}px`} className="object-cover" unoptimized />
            )}
        </span>
    );
}

export function EntryLink({entry, className}: {entry: RecordEntry; className?: string}) {
    const href = recordEntryHref(entry);
    const name = recordEntryName(entry);
    if (!href) return <span className={cn("min-w-0 truncate", className)}>{name}</span>;
    return (
        <Link href={href} className={cn("min-w-0 truncate", ROW_LINK, className)}>
            {name}
        </Link>
    );
}
