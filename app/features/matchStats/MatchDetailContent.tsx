"use client";

import {useState} from "react";
import {MatchDetail} from "@/server/domains/match";
import BoxScore from "@/app/features/matchStats/BoxScore";
import MatchHeader from "@/app/features/matchStats/MatchHeader";
import TeamViewToggle, {MatchView} from "@/app/features/matchStats/TeamViewToggle";

type Props = {
    detail: MatchDetail;
};

export default function MatchDetailContent({detail}: Props) {
    const {match, sets, homeTeam, awayTeam, statSets, statTotals} = detail;
    const [view, setView] = useState<MatchView>("home-only");
    const [detailed, setDetailed] = useState(false);

    const setCount = sets.length;
    const showHome = view !== "away-only";
    const showAway = view !== "home-only";

    const isPlayable = match.status === "completed" && !match.is_forfeit;

    return (
        <div className="space-y-6">
            <MatchHeader detail={detail} />

            {!isPlayable ? (
                <NonPlayableNotice match={match} />
            ) : (
                <>
                    <TeamViewToggle
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
                        view={view}
                        onViewChange={setView}
                        detailed={detailed}
                        onDetailedChange={setDetailed}
                    />

                    <BoxScore
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
                        statSets={statSets}
                        statTotals={statTotals}
                        setCount={setCount}
                        detailed={detailed}
                        showHome={showHome}
                        showAway={showAway}
                    />
                </>
            )}
        </div>
    );
}

function NonPlayableNotice({match}: {match: MatchDetail["match"]}) {
    if (match.is_forfeit) {
        return (
            <div className="panel p-6">
                <p className="text-sm text-muted-foreground">
                    This match was forfeited — no box score is available.
                </p>
            </div>
        );
    }

    if (match.status === "pending" || match.status === "scheduled") {
        const when = match.scheduled_at
            ? new Date(match.scheduled_at).toLocaleString()
            : "Time TBD";
        return (
            <div className="panel p-6 space-y-1">
                <p className="text-sm">This match hasn&apos;t been played yet.</p>
                <p className="text-xs text-muted-foreground">Scheduled: {when}</p>
            </div>
        );
    }

    return null;
}
