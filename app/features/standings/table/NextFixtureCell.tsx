"use client";

import Link from "next/link";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/app/components/ui/tooltip";
import {TeamLogo} from "@/app/features/player/detail/TeamLogoLink";
import {TodayMark} from "@/app/(public)/home/sections/TeamMark";
import {formatDateInTimezone, getRegionTimezone} from "@/app/utils/timezoneOptions";
import type {NextFixture} from "../model/types";
import type {StandingsLinkMode} from "./StandingsGrid";
import {fixtureHref} from "./fixtureHref";

function whenText(next: NextFixture, regionCode: string): string | null {
    if (next.scheduledAt) return formatDateInTimezone(next.scheduledAt, getRegionTimezone(regionCode));
    if (next.week !== null) return `Week ${next.week}`;
    return null;
}

export function NextFixtureCell({next, regionCode, seasonSlug, linkMode}: {
    next: NextFixture | null;
    regionCode: string;
    seasonSlug: string;
    linkMode: StandingsLinkMode;
}) {
    if (!next) return null;
    const when = whenText(next, regionCode);
    const label = `Next: vs ${next.opponent.name}${when ? `, ${when}` : ""}`;
    const href = fixtureHref({
        linkMode,
        matchId: next.matchId,
        matchCode: next.matchCode,
        homeTeamName: next.homeTeamName,
        awayTeamName: next.awayTeamName,
        regionCode,
        seasonSlug,
    });
    const logo = (
        <TeamLogo
            team={{team_name: next.opponent.name, team_logo_url: next.opponent.logoUrl, team_logo_bg_removed: next.opponent.logoBgRemoved}}
            size={20}
        />
    );
    const triggerClass = "inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

    return (
        <span className="inline-flex items-center gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    {href ? (
                        <Link href={href} prefetch={false} aria-label={label} className={triggerClass}>{logo}</Link>
                    ) : (
                        <span tabIndex={0} aria-label={label} className={triggerClass}>{logo}</span>
                    )}
                </TooltipTrigger>
                <TooltipContent className="font-sans text-xs">
                    vs {next.opponent.name}{when ? ` · ${when}` : ""}
                </TooltipContent>
            </Tooltip>
            {next.isToday && <span className="text-xs"><TodayMark>Today</TodayMark></span>}
        </span>
    );
}
