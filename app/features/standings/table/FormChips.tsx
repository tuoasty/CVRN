"use client";

import Link from "next/link";
import {cn} from "@/lib/utils";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/app/components/ui/tooltip";
import {TeamLogo} from "@/app/features/player/detail/TeamLogoLink";
import type {FormEntry, TeamRef} from "../model/types";
import type {StandingsLinkMode} from "./StandingsGrid";
import {fixtureHref} from "./fixtureHref";

const UNKNOWN = "Unknown team";

function Logo({team}: {team: TeamRef | null}) {
    return (
        <TeamLogo
            team={{team_name: team?.name ?? UNKNOWN, team_logo_url: team?.logoUrl ?? null, team_logo_bg_removed: team?.logoBgRemoved ?? false}}
            size={16}
        />
    );
}

export function FormChips({team, form, regionCode, seasonSlug, linkMode}: {
    team: TeamRef;
    form: FormEntry[];
    regionCode: string;
    seasonSlug: string;
    linkMode: StandingsLinkMode;
}) {
    return (
        <span className="flex w-[106px] gap-1">
            {form.map(f => {
                const opponentName = f.opponent?.name ?? UNKNOWN;
                const label = `${f.outcome === "W" ? "Win" : "Loss"} ${f.teamSets}-${f.opponentSets} against ${opponentName}`;
                const href = fixtureHref({
                    linkMode,
                    matchId: f.matchId,
                    matchCode: f.matchCode,
                    homeTeamName: f.homeTeamName,
                    awayTeamName: f.awayTeamName,
                    regionCode,
                    seasonSlug,
                });
                const chipClass = cn(
                    "grid h-[18px] w-[18px] place-items-center text-[11px] font-semibold leading-none text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground",
                    f.outcome === "W" ? "bg-form-win" : "bg-form-loss",
                );
                return (
                    <Tooltip key={f.matchId}>
                        <TooltipTrigger asChild>
                            {href ? (
                                <Link href={href} prefetch={false} aria-label={label} className={chipClass}>{f.outcome}</Link>
                            ) : (
                                <span tabIndex={0} aria-label={label} className={cn(chipClass, "cursor-default")}>{f.outcome}</span>
                            )}
                        </TooltipTrigger>
                        <TooltipContent className="font-sans text-xs">
                            <span className="flex items-center gap-2 whitespace-nowrap">
                                <Logo team={team} />
                                <span className="font-medium">{team.name}</span>
                                <span className="font-mono font-semibold tabular-nums">{f.teamSets}-{f.opponentSets}</span>
                                <span className="font-medium">{opponentName}</span>
                                <Logo team={f.opponent} />
                            </span>
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </span>
    );
}
