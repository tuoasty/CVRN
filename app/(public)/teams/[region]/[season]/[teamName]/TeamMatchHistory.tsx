import { CalendarDays } from "lucide-react";
import PublicMatchCard from "@/app/(public)/matches/PublicMatchCard";
import { buildPublicMatchHref } from "@/app/utils/matchDetailHref";
import { getMatchTypeLabel } from "@/app/utils/matchLabel";
import type { MatchWithDetails } from "@/server/domains/match";
import type { TeamWithRegion } from "@/server/domains/team";
import type { StandingMethod } from "@/shared/types/standing";

function orientForTeam(md: MatchWithDetails, teamId: string): MatchWithDetails {
    const m = md.match;
    if (m.home_team_id === teamId) return md;
    return {
        ...md,
        match: {
            ...m,
            home_team_id: m.away_team_id,
            away_team_id: m.home_team_id,
            home_sets_won: m.away_sets_won,
            away_sets_won: m.home_sets_won,
            home_team_points: m.away_team_points,
            away_team_points: m.home_team_points,
            home_team_bonus: m.away_team_bonus,
            away_team_bonus: m.home_team_bonus,
            home_team_lvr: m.away_team_lvr,
            away_team_lvr: m.home_team_lvr,
        },
        sets: md.sets.map(s => ({ ...s, home_score: s.away_score, away_score: s.home_score })),
    };
}

type Props = {
    matches: MatchWithDetails[];
    teams: Record<string, TeamWithRegion>;
    teamId: string;
    regionCode: string;
    seasonSlug: string;
    standingMethod: StandingMethod;
};

export default function TeamMatchHistory({ matches, teams, teamId, regionCode, seasonSlug, standingMethod }: Props) {
    if (matches.length === 0) {
        return (
            <div className="panel p-12">
                <div className="text-center space-y-2">
                    <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">No matches played yet.</p>
                </div>
            </div>
        );
    }

    const ordered = [...matches].sort(
        (a, b) =>
            (a.match.status === "pending" ? 0 : 1) - (b.match.status === "pending" ? 0 : 1),
    );

    return (
        <div className="space-y-3">
            {ordered.map((md, index) => {
                const original = md.match;
                const originalHome = original.home_team_id ? teams[original.home_team_id] : undefined;
                const originalAway = original.away_team_id ? teams[original.away_team_id] : undefined;
                const oriented = orientForTeam(md, teamId);
                const homeTeam = oriented.match.home_team_id ? teams[oriented.match.home_team_id] : undefined;
                const awayTeam = oriented.match.away_team_id ? teams[oriented.match.away_team_id] : undefined;
                const label = getMatchTypeLabel(original.match_type, original.week, md.playoff_round ?? null);
                return (
                    <PublicMatchCard
                        key={original.id}
                        matchDetails={oriented}
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
                        regionCode={regionCode}
                        href={buildPublicMatchHref({
                            matchCode: original.match_code,
                            homeTeamName: originalHome?.name,
                            awayTeamName: originalAway?.name,
                            regionCode,
                            seasonSlug,
                        })}
                        isPriority={index < 2}
                        standingMethod={standingMethod}
                        labelOverride={label}
                        minimalMeta
                    />
                );
            })}
        </div>
    );
}
