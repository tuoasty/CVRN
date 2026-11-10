"use client";

import { useMemo } from "react";
import { useSeasonContext } from "@/app/(public)/[region]/[season]/context";
import { buildIncomingMap } from "@/app/hooks/usePlayoffs";
import { PlayoffBracketDisplay } from "@/app/features/playoffs/PlayoffBracketDisplay";
import { findChampion, type BracketEntry } from "@/app/features/playoffs/model/bracketModel";
import type { PlayoffBracket, Match } from "@/shared/types/db";
import type { TeamWithRegion } from "@/server/domains/team";

type Props = {
    brackets: PlayoffBracket[];

    matches: Match[];

    teams: TeamWithRegion[];
};

function EmptyLine({ children }: { children: string }) {
    return (
        <div className="grid min-h-[320px] place-items-center">
            <p className="text-sm text-muted-foreground">{children}</p>
        </div>
    );
}

export default function PlayoffsPage({ brackets, matches, teams }: Props) {
    const { season, region } = useSeasonContext();
    const hasPlayoffs = season.playoff_started;
    const isCompleted = season.end_date
        ? new Date(season.end_date) < new Date()
        : false;

    const incomingMap = useMemo(() => buildIncomingMap(brackets), [brackets]);

    const championName = useMemo(() => {
        const matchById = new Map(matches.map((m) => [m.id, m]));
        const entries: BracketEntry[] = brackets
            .filter((b) => matchById.has(b.match_id))
            .map((b) => ({ ...b, match: matchById.get(b.match_id)! }));
        const champion = findChampion(entries);
        if (!champion) return null;
        return teams.find((t) => t.id === champion.teamId)?.name ?? null;
    }, [brackets, matches, teams]);

    return (
        <>
            <div className="page-wide space-y-6 py-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Playoffs</h1>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                        {season.name} · {region.name}
                        {hasPlayoffs && !isCompleted && " · In progress"}
                        {isCompleted && championName && (
                            <>
                                {" · Champion "}
                                <span className="font-semibold text-foreground">{championName}</span>
                            </>
                        )}
                        {isCompleted && !championName && " · Completed"}
                    </p>
                </div>

                {!hasPlayoffs ? (
                    <EmptyLine>Playoffs have not started for this season.</EmptyLine>
                ) : brackets.length === 0 ? (
                    <EmptyLine>No bracket data found.</EmptyLine>
                ) : null}
            </div>

            {hasPlayoffs && brackets.length > 0 && (
                <div className="page-bleed pb-6">
                    <PlayoffBracketDisplay
                        brackets={brackets}
                        incomingMap={incomingMap}
                        teams={teams}
                        matches={matches}
                        regionCode={region.code}
                        seasonSlug={season.slug}
                        linkContext="public"
                    />
                </div>
            )}
        </>
    );
}
