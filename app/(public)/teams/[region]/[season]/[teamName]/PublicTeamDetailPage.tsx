import { PlayerLeaderboardRow } from "@/server/domains/player";
import { TeamWithRegion, TeamNameHistoryEntry } from "@/server/domains/team";
import { MatchWithDetails } from "@/server/domains/match";
import type { StandingWithInfo } from "@/server/domains/standing";
import { StandingMethod } from "@/shared/types/standing";
import type { RankedValue } from "@/app/features/teams/model/strength";
import type { RosterTile } from "@/app/features/teams/detail/model/roster";
import TeamHeader from "./TeamHeader";
import RosterSection from "./RosterSection";
import LeadersSection, { type LeaderPlayer } from "./LeadersSection";
import BreakdownSection from "./BreakdownSection";
import type { Leader } from "@/app/features/teams/detail/model/leaders";
import type { TeamBreakdown } from "@/app/features/teams/detail/model/breakdown";
import TeamStatsSection from "./TeamStatsSection";
import TeamMatchHistory from "./TeamMatchHistory";

type Props = {
    team: TeamWithRegion;
    rosterTiles: RosterTile[];
    history: TeamNameHistoryEntry[];
    statRows: PlayerLeaderboardRow[];
    matches: MatchWithDetails[];
    matchTeams: Record<string, TeamWithRegion>;
    regionCode: string;
    seasonSlug: string;
    standingMethod: StandingMethod;
    standing: StandingWithInfo | null;
    teamCount: number;
    strength: RankedValue;
    leaders: { source: "season" | "alltime"; leaders: Leader[] };
    leaderPlayers: Record<string, LeaderPlayer>;
    breakdown: TeamBreakdown | null;
};

export default function PublicTeamDetailPage({
    team,
    rosterTiles,
    history,
    statRows,
    matches,
    matchTeams,
    regionCode,
    seasonSlug,
    standingMethod,
    standing,
    teamCount,
    strength,
    leaders,
    leaderPlayers,
    breakdown,
}: Props) {
    const formerName = history.find((h) => h.oldName !== team.name)?.oldName ?? null;
    const maxPlayers = team.seasons?.max_players ?? 18;
    const teamsHref = `/${encodeURIComponent(regionCode)}/${encodeURIComponent(seasonSlug)}/teams`;

    return (
        <div className="page-wide py-6">
            <TeamHeader
                team={team}
                formerName={formerName}
                standing={standing}
                teamCount={teamCount}
                standingMethod={standingMethod}
                strength={strength}
                teamsHref={teamsHref}
            />

            <div className="mt-12 grid gap-12 min-[1100px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                <RosterSection tiles={rosterTiles} maxPlayers={maxPlayers} />
                <div className="min-w-0 space-y-12">
                    <LeadersSection source={leaders.source} leaders={leaders.leaders} players={leaderPlayers} />
                    <BreakdownSection breakdown={breakdown} />
                </div>
            </div>

            <div className="mt-12">
                <TeamMatchHistory
                    matches={matches}
                    teams={matchTeams}
                    teamId={team.id}
                    regionCode={regionCode}
                    seasonSlug={seasonSlug}
                    standingMethod={standingMethod}
                />
            </div>

            <div className="mt-12 space-y-3">
                <h3 className="text-sm uppercase tracking-wide text-muted-foreground">Season Stats</h3>
                <TeamStatsSection rows={statRows} />
            </div>
        </div>
    );
}
