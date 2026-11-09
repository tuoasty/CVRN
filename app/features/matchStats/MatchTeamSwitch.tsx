"use client";

import {Fragment} from "react";
import {cn} from "@/lib/utils";
import type {Team} from "@/shared/types/db";
import {TeamMark} from "@/app/(public)/home/sections/TeamMark";

export type TeamSide = "home" | "away";

export function MatchTeamSwitch({homeTeam, awayTeam, value, onChange}: {
    homeTeam: Team;
    awayTeam: Team;
    value: TeamSide;
    onChange: (side: TeamSide) => void;
}) {
    const options: {side: TeamSide; team: Team}[] = [
        {side: "home", team: homeTeam},
        {side: "away", team: awayTeam},
    ];
    return (
        <div role="group" aria-label="Team" className="-ml-2 flex min-w-0 items-center gap-0.5">
            {options.map(({side, team}, i) => {
                const selected = side === value;
                return (
                    <Fragment key={side}>
                        {i > 0 && <span aria-hidden className="text-sm text-border">/</span>}
                        <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onChange(side)}
                            className={cn(
                                "flex min-w-0 items-center gap-2 px-2 py-1 text-sm transition-colors duration-150 motion-reduce:transition-none",
                                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                                selected
                                    ? "font-semibold text-foreground"
                                    : "font-medium text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <TeamMark
                                team={{id: team.id, name: team.name, logoUrl: team.logo_url, logoBgRemoved: team.logo_bg_removed, href: null}}
                                size={24}
                                className={cn(!selected && "opacity-60")}
                            />
                            <span className={cn("truncate", selected && "underline decoration-2 underline-offset-[6px]")}>{team.name}</span>
                        </button>
                    </Fragment>
                );
            })}
        </div>
    );
}
