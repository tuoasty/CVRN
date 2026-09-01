"use client";

import Image from "next/image";
import Link from "next/link";
import { Trophy, Medal } from "lucide-react";
import { SeasonPodiumEntryWithTeam } from "@/server/domains/season";
import { buildPublicTeamHref } from "@/app/utils/matchDetailHref";

interface SeasonChampionCardProps {
    podium: SeasonPodiumEntryWithTeam[];
    seasonName?: string;
    regionCode?: string;
    seasonSlug?: string;
}

function TeamLogo({
    name,
    logoUrl,
    size,
}: {
    name: string;
    logoUrl: string | null;
    size: number;
}) {
    if (logoUrl) {
        return (
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <Image
                    src={logoUrl}
                    alt={name}
                    fill
                    sizes={`${size}px`}
                    className="object-contain mix-blend-multiply dark:mix-blend-screen"
                />
            </div>
        );
    }
    return (
        <div
            className="rounded-sm flex items-center justify-center font-bold bg-primary/10 text-primary shrink-0"
            style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
        >
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

export default function SeasonChampionCard({ podium, seasonName, regionCode, seasonSlug }: SeasonChampionCardProps) {
    const sorted = [...podium].sort((a, b) => a.place - b.place);
    const champion = sorted.find((e) => e.place === 1);
    const runnerUp = sorted.find((e) => e.place === 2);
    const third = sorted.find((e) => e.place === 3);

    const championHref = champion ? buildPublicTeamHref({regionCode, seasonSlug, teamSlug: champion.teams.slug}) : null;
    const runnerUpHref = runnerUp ? buildPublicTeamHref({regionCode, seasonSlug, teamSlug: runnerUp.teams.slug}) : null;
    const thirdHref = third ? buildPublicTeamHref({regionCode, seasonSlug, teamSlug: third.teams.slug}) : null;

    const championContent = champion ? (
        <div className="flex flex-col items-center gap-3 py-6 px-6">
            <TeamLogo name={champion.teams.name} logoUrl={champion.teams.logo_url} size={112} />
            <span className="text-xl font-bold text-center">{champion.teams.name}</span>
        </div>
    ) : (
        <div className="flex flex-col items-center justify-center py-6 px-6">
            <Trophy className="h-10 w-10 text-secondary/30 mb-2" />
            <p className="text-sm text-muted-foreground">Champion not yet set</p>
        </div>
    );

    return (
        <div className="panel bg-secondary/5 h-[376px]">
            {}
            <div className="flex items-center justify-between px-6 pt-3 pb-3 border-b border-secondary/20">
                <div className="flex items-center gap-2 text-secondary">
                    <Trophy className="h-4 w-4" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Season Champion</h3>
                </div>
                {seasonName && (
                    <span className="text-xs text-muted-foreground font-medium">{seasonName}</span>
                )}
            </div>

            {}
            {championHref ? (
                <Link href={championHref} prefetch={false} className="block hover:opacity-90 transition-opacity">
                    {championContent}
                </Link>
            ) : championContent}

            {}
            {(runnerUp || third) && (
                <div className="grid grid-cols-2 gap-px border-t border-secondary/20">
                    {runnerUp ? (
                        runnerUpHref ? (
                            <Link href={runnerUpHref} prefetch={false} className="flex flex-col items-center gap-2 py-4 px-4 bg-muted/50 hover:opacity-90 transition-opacity">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Medal className="h-3 w-3" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider">Runner-Up</span>
                                </div>
                                <TeamLogo name={runnerUp.teams.name} logoUrl={runnerUp.teams.logo_url} size={52} />
                                <span className="text-xs font-semibold text-center leading-tight">{runnerUp.teams.name}</span>
                            </Link>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-4 px-4 bg-muted/50">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Medal className="h-3 w-3" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider">Runner-Up</span>
                                </div>
                                <TeamLogo name={runnerUp.teams.name} logoUrl={runnerUp.teams.logo_url} size={52} />
                                <span className="text-xs font-semibold text-center leading-tight">{runnerUp.teams.name}</span>
                            </div>
                        )
                    ) : <div />}

                    {third ? (
                        thirdHref ? (
                            <Link href={thirdHref} prefetch={false} className="flex flex-col items-center gap-2 py-4 px-4 bg-muted/50 border-l border-border hover:opacity-90 transition-opacity">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Medal className="h-3 w-3" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider">3rd Place</span>
                                </div>
                                <TeamLogo name={third.teams.name} logoUrl={third.teams.logo_url} size={52} />
                                <span className="text-xs font-semibold text-center leading-tight">{third.teams.name}</span>
                            </Link>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-4 px-4 bg-muted/50 border-l border-border">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Medal className="h-3 w-3" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider">3rd Place</span>
                                </div>
                                <TeamLogo name={third.teams.name} logoUrl={third.teams.logo_url} size={52} />
                                <span className="text-xs font-semibold text-center leading-tight">{third.teams.name}</span>
                            </div>
                        )
                    ) : <div />}
                </div>
            )}
        </div>
    );
}
