"use client";

import Link from "next/link";
import AvatarImage from "@/app/components/ui/AvatarImage";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/app/components/ui/tabs";
import type {TeamRosters, RosterPlayer} from "@/server/domains/match";
import type {Team} from "@/shared/types/db";
import {buildPublicPlayerHref} from "@/app/utils/matchDetailHref";

const ROLE_BADGE: Record<string, {label: string; className: string}> = {
    captain: {
        label: "C",
        className: "bg-muted text-foreground border-border",
    },
    vice_captain: {
        label: "VC",
        className: "bg-muted text-muted-foreground border-border",
    },
    court_captain: {
        label: "CC",
        className: "bg-muted text-muted-foreground border-border",
    },
};

function PlayerAvatar({player}: {player: RosterPlayer}) {
    return (
        <div className="relative w-[60px] h-[60px] rounded-full overflow-hidden border border-border shrink-0">
            <AvatarImage
                src={player.avatar_url}
                alt={player.display_name ?? player.username ?? "Player"}
                sizes="60px"
            />
        </div>
    );
}

function RoleBadge({role}: {role: string}) {
    const badge = ROLE_BADGE[role];
    if (!badge) return null;
    return (
        <span
            className={`inline-flex items-center h-5 px-1.5 rounded-sm border text-[10px] font-bold shrink-0 ${badge.className}`}
        >
            {badge.label}
        </span>
    );
}

function PlayerRow({player, align}: {player: RosterPlayer; align: "left" | "right"}) {
    const hasBothNames =
        !!player.display_name &&
        !!player.username &&
        player.display_name !== player.username;
    const href = buildPublicPlayerHref(player.username);

    const inner = (
        <>
            <PlayerAvatar player={player} />
            <RoleBadge role={player.role} />
            <div
                className={`flex flex-col min-w-0 leading-tight flex-1 ${
                    align === "right" ? "items-end" : "items-start"
                }`}
            >
                <span className="text-base font-semibold truncate max-w-full">
                    {player.display_name ?? player.username ?? "Unknown"}
                </span>
                {hasBothNames && (
                    <span className="text-xs text-muted-foreground truncate max-w-full">
                        @{player.username}
                    </span>
                )}
            </div>
        </>
    );

    const rowClass = `flex items-center gap-4 px-4 py-3 w-full hover:bg-muted/30 transition-colors ${
        align === "right" ? "flex-row-reverse" : "flex-row"
    }`;

    if (href) {
        return (
            <Link href={href} prefetch={false} className={rowClass}>
                {inner}
            </Link>
        );
    }
    return <div className={rowClass}>{inner}</div>;
}

function PlayerList({players, align}: {players: RosterPlayer[]; align: "left" | "right"}) {
    return (
        <div className="py-1">
            {players.map(player => (
                <PlayerRow key={player.player_id} player={player} align={align} />
            ))}
        </div>
    );
}

type Props = {
    homeTeam: Team | null;
    awayTeam: Team | null;
    rosters: TeamRosters;
};

export default function PreMatchRosters({homeTeam, awayTeam, rosters}: Props) {
    const homeName = homeTeam?.name ?? "Home";
    const awayName = awayTeam?.name ?? "Away";

    return (
        <div>
            {}
            <div className="hidden sm:grid grid-cols-[1fr_1px_1fr]">
                <div>
                    <div className="px-4 py-2.5 text-right border-b border-border">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {homeName}
                        </span>
                    </div>
                    <PlayerList players={rosters.home} align="right" />
                </div>
                <div className="bg-border" />
                <div>
                    <div className="px-4 py-2.5 text-left border-b border-border">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {awayName}
                        </span>
                    </div>
                    <PlayerList players={rosters.away} align="left" />
                </div>
            </div>

            {}
            <div className="sm:hidden">
                <Tabs defaultValue="home">
                    <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
                        <TabsTrigger
                            value="home"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 text-xs font-medium"
                        >
                            {homeName}
                        </TabsTrigger>
                        <TabsTrigger
                            value="away"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 text-xs font-medium"
                        >
                            {awayName}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="home" className="mt-0">
                        <PlayerList players={rosters.home} align="left" />
                    </TabsContent>
                    <TabsContent value="away" className="mt-0">
                        <PlayerList players={rosters.away} align="left" />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
