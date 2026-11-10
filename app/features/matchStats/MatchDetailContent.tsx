"use client";

import {useLayoutEffect, useMemo, useState} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {MatchDetail} from "@/server/domains/match";
import {POSITIONS} from "@/shared/volleyball/positions";
import {InlineSwitch} from "@/app/components/filters/InlineSwitch";
import BoxScore from "@/app/features/matchStats/BoxScore";
import MatchHero from "@/app/features/matchStats/MatchHero";
import MatchCrew from "@/app/features/matchStats/MatchCrew";
import {MatchTeamSwitch, type TeamSide} from "@/app/features/matchStats/MatchTeamSwitch";
import PreMatchComparison from "@/app/features/matchStats/preMatch/PreMatchComparison";
import MatchVodSection from "@/app/features/media/MatchVodSection";
import type {MatchExtras} from "./loadMatchExtras";

type Props = {
    detail: MatchDetail;
    extras: MatchExtras | null;
};

type View = "simple" | "detailed";

function useDetailParams(detail: MatchDetail) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [defaultView, setDefaultView] = useState<View>("simple");
    useLayoutEffect(() => {
        setDefaultView(window.matchMedia("(min-width: 640px)").matches ? "detailed" : "simple");
    }, []);

    const teamParam = searchParams.get("team");
    const side: TeamSide = teamParam && teamParam === detail.awayTeam?.slug ? "away" : "home";
    const setParam = Number(searchParams.get("set"));
    const set = Number.isInteger(setParam) && setParam >= 1 && setParam <= detail.sets.length ? setParam : 0;
    const viewParam = searchParams.get("view");
    const view: View = viewParam === "detailed" || viewParam === "simple" ? viewParam : defaultView;

    const update = (changes: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(changes)) {
            if (value === null) params.delete(key);
            else params.set(key, value);
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {scroll: false});
    };

    return {
        side,
        set,
        view,
        setSide: (next: TeamSide) => update({team: next === "away" ? detail.awayTeam?.slug ?? null : null}),
        setSet: (next: number) => update({set: next > 0 ? String(next) : null}),
        setView: (next: View) => update({view: next}),
    };
}

export default function MatchDetailContent({detail, extras}: Props) {
    const {match, homeTeam, awayTeam, statSets, statTotals} = detail;
    const {side, set, view, setSide, setSet, setView} = useDetailParams(detail);
    const selectedTeam = side === "home" ? homeTeam : awayTeam;

    const positionsByPlayer = useMemo(() => {
        const rank = new Map(POSITIONS.map((p, i) => [p.code as string, i]));
        const byPlayer = new Map<string, Set<string>>();
        for (const s of statSets) {
            if (!s.position || !s.player_id) continue;
            const entry = byPlayer.get(s.player_id) ?? new Set<string>();
            entry.add(s.position);
            byPlayer.set(s.player_id, entry);
        }
        const out = new Map<string, string[]>();
        for (const [playerId, entry] of byPlayer) {
            out.set(playerId, [...entry].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99)));
        }
        return out;
    }, [statSets]);

    const isCompleted = match.status === "completed";
    const isPlayable = isCompleted && !match.is_forfeit;
    const hasStats = statTotals.length > 0;
    const vod = detail.mediaPosts.find(p => p.type === "video") ?? null;
    const players = extras?.players ?? null;
    const setOptions = [
        {value: "0", label: "Total"},
        ...detail.sets.map((_, i) => ({value: String(i + 1), label: `S${i + 1}`})),
    ];

    const teamSwitch = homeTeam && awayTeam ? (
        <MatchTeamSwitch homeTeam={homeTeam} awayTeam={awayTeam} value={side} onChange={setSide} />
    ) : null;

    return (
        <div>
            <MatchHero detail={detail} extras={extras} />

            <div className="mt-6">
                <MatchCrew officials={detail.officials} />
            </div>

            {isPlayable && hasStats && (
                <section className="mt-11">
                    <h2 className="text-xl font-semibold tracking-tight">Box score</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-2">
                        {teamSwitch}
                        <InlineSwitch label="Set" options={setOptions} value={String(set)} onChange={v => setSet(Number(v))} />
                        <InlineSwitch
                            label="Columns"
                            className="sm:ml-auto"
                            options={[{value: "simple", label: "Simple"}, {value: "detailed", label: "Detailed"}]}
                            value={view}
                            onChange={setView}
                        />
                    </div>
                    <div className="mt-2">
                        <BoxScore
                            homeTeam={homeTeam}
                            awayTeam={awayTeam}
                            rows={set === 0 ? statTotals : statSets.filter(r => r.set_number === set)}
                            selectedTeam={selectedTeam}
                            detailed={view === "detailed"}
                            showSetsPlayed={set === 0}
                            positionsByPlayer={set === 0 ? positionsByPlayer : undefined}
                        />
                    </div>
                </section>
            )}

            {!match.is_forfeit && players && !(isPlayable && hasStats) && (
                <section className="mt-11">
                    <h2 className="text-center text-xl font-semibold tracking-tight">Players</h2>
                    <div className="mt-4">
                        <PreMatchComparison
                            home={players.home}
                            away={players.away}
                            homeName={homeTeam?.name ?? "Home"}
                            awayName={awayTeam?.name ?? "Away"}
                        />
                    </div>
                </section>
            )}

            {match.is_forfeit && (
                <p className="mt-8 text-sm text-muted-foreground">This match was forfeited, so there is no box score.</p>
            )}

            {vod && (
                <div className="mt-11">
                    <MatchVodSection post={vod} />
                </div>
            )}
        </div>
    );
}
