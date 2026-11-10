import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DefaultTeamLogo } from "@/app/components/ui/DefaultTeamLogo";
import { getLogoClassName } from "@/app/lib/logoClass";
import { metricFor } from "@/app/features/standings/model/buildStandingsTable";
import { formatStrength, ordinal, type RankedValue } from "@/app/features/teams/model/strength";
import type { TeamWithRegion } from "@/server/domains/team";
import type { StandingWithInfo } from "@/server/domains/standing";
import type { StandingMethod } from "@/shared/types/standing";
import type { ReactNode } from "react";

type Props = {
    team: TeamWithRegion;
    formerName: string | null;
    standing: StandingWithInfo | null;
    teamCount: number;
    standingMethod: StandingMethod;
    strength: RankedValue;
    teamsHref: string;
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-mono text-xl tabular-nums text-foreground">{children}</dd>
        </div>
    );
}

function Small({ children }: { children: ReactNode }) {
    return <span className="ml-1.5 font-sans text-xs text-muted-foreground">{children}</span>;
}

function Dot() {
    return <span aria-hidden>·</span>;
}

export default function TeamHeader({ team, formerName, standing, teamCount, standingMethod, strength, teamsHref }: Props) {
    const region = team.seasons?.regions;
    const played = (standing?.wins ?? 0) + (standing?.losses ?? 0);
    const hasPlace = !!standing && standing.rank != null && played > 0;
    const metricLabel = standingMethod === "lvr" ? "LVR" : "Pts";
    const metricValue = standing
        ? standingMethod === "lvr"
            ? metricFor(standing, standingMethod).toFixed(1)
            : String(metricFor(standing, standingMethod))
        : "-";
    const hex = team.brick_color ? team.brick_color.toUpperCase() : null;

    return (
        <header>
            <Link
                href={teamsHref}
                prefetch={false}
                className="-ml-1 inline-flex h-11 items-center gap-1 px-1 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Teams
            </Link>

            <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
                <div className="relative h-24 w-24 shrink-0 sm:h-32 sm:w-32">
                    {team.logo_url ? (
                        <Image
                            src={team.logo_url}
                            alt=""
                            fill
                            priority
                            sizes="(max-width: 640px) 96px, 128px"
                            className={getLogoClassName(team.logo_bg_removed)}
                        />
                    ) : (
                        <DefaultTeamLogo sizes="(max-width: 640px) 96px, 128px" alt="" />
                    )}
                </div>

                <div className="min-w-0">
                    <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">{team.name}</h1>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-muted-foreground">
                        {formerName && (
                            <>
                                <span>Formerly {formerName}</span>
                                <Dot />
                            </>
                        )}
                        {region && (
                            <>
                                <span>
                                    <span className="font-mono font-semibold text-foreground">{region.code.toUpperCase()}</span>{" "}
                                    {region.name}
                                </span>
                                <Dot />
                            </>
                        )}
                        <span>{team.seasons?.name}</span>
                        {(hex || team.brick_number != null) && (
                            <>
                                <Dot />
                                <span className="flex items-center gap-1.5">
                                    {hex && (
                                        <span
                                            aria-hidden
                                            className="h-2.5 w-2.5 shrink-0 border border-border"
                                            style={{ backgroundColor: team.brick_color }}
                                        />
                                    )}
                                    {team.brick_number != null && <span className="font-mono">#{team.brick_number}</span>}
                                    {team.brick_number != null && hex && <Dot />}
                                    {hex && <span className="font-mono">{hex}</span>}
                                </span>
                            </>
                        )}
                    </p>

                    <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10">
                        <Fact label="Place">
                            {hasPlace ? (
                                <>
                                    {ordinal(standing!.rank!)}
                                    <Small>of {teamCount}</Small>
                                </>
                            ) : (
                                "-"
                            )}
                        </Fact>
                        <Fact label="Record">{standing ? `${standing.wins ?? 0}-${standing.losses ?? 0}` : "-"}</Fact>
                        <Fact label={metricLabel}>{metricValue}</Fact>
                        <Fact label="Team strength">
                            {formatStrength(strength.value)}
                            {strength.rank != null && <Small>{ordinal(strength.rank)}</Small>}
                        </Fact>
                    </dl>
                </div>
            </div>
        </header>
    );
}
