import { notFound, redirect } from "next/navigation";
import MatchesPage from "@/app/(public)/matches/MatchesPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedStandings,
    getCachedTeamsWithRegionsIncludingInactive,
    getCachedWeekSchedule,
    getCachedPlayoffSchedule,
    getCachedDefaultWeekForSeason,
    getCachedAvailablePlayoffRounds,
    getCachedCompletedPlayoffRounds,
    getCachedWeekMatchCounts,
} from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import { isPlayoffRound, sortRounds } from "@/app/utils/playoffRounds";
import type { PlayoffRound } from "@/server/domains/playoff";
import type { MatchWithDetails } from "@/server/domains/match";

type PageProps = {
    params: Promise<{ region: string; season: string }>;
    searchParams: Promise<{ tab?: string; week?: string; round?: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
    const { region, season } = await params;
    const { tab, week: weekParam, round: rawRound } = await searchParams;

    const regionRecord = await getCachedRegionByCode(safeDecodeURIComponent(region).toLowerCase());
    if (!regionRecord) notFound();

    const seasonRecord = await getCachedSeasonBySlugAndRegion(
        safeDecodeURIComponent(season).toLowerCase(),
        regionRecord.id,
    );
    if (!seasonRecord) notFound();

    const hasPlayoffs = !!seasonRecord.playoff_started;
    const activeTab =
        tab === "playoffs" ? "playoffs"
        : tab === "season" ? "season"
        : hasPlayoffs ? "playoffs" : "season";

    const [standings, allTeams, weekCounts, availableRounds, completedRounds] = await Promise.all([
        getCachedStandings(seasonRecord.id, regionRecord.id),
        getCachedTeamsWithRegionsIncludingInactive(),
        getCachedWeekMatchCounts(seasonRecord.id),
        hasPlayoffs ? getCachedAvailablePlayoffRounds(seasonRecord.id) : Promise.resolve([]),
        hasPlayoffs ? getCachedCompletedPlayoffRounds(seasonRecord.id) : Promise.resolve([]),
    ]);

    const parsedWeek = weekParam ? parseInt(weekParam, 10) : NaN;
    let effectiveWeek: number;
    if (Number.isFinite(parsedWeek)) {
        effectiveWeek = parsedWeek;
    } else if (activeTab === "season") {
        effectiveWeek = await getCachedDefaultWeekForSeason(seasonRecord.id);
    } else {
        effectiveWeek = 1;
    }

    const sortedRounds = sortRounds(availableRounds.filter(isPlayoffRound));
    const sortedCompletedRounds = sortRounds(completedRounds.filter(isPlayoffRound));
    const latestCompletedRound = sortedCompletedRounds[sortedCompletedRounds.length - 1];
    const roundParam: PlayoffRound | null = isPlayoffRound(rawRound) ? rawRound : null;
    const effectiveRound: PlayoffRound =
        roundParam && sortedRounds.includes(roundParam)
            ? roundParam
            : latestCompletedRound ?? sortedRounds[0] ?? "play_in";

    if (!tab) {
        const canonical = new URLSearchParams();
        if (hasPlayoffs) {
            canonical.set("tab", "playoffs");
            canonical.set("round", effectiveRound);
        } else {
            canonical.set("tab", "season");
            canonical.set("week", String(effectiveWeek));
        }
        redirect(`/${region}/${season}/matches?${canonical.toString()}`);
    }

    let schedule: MatchWithDetails[] = [];
    if (activeTab === "season") {
        schedule = await getCachedWeekSchedule(seasonRecord.id, effectiveWeek);
    } else if (hasPlayoffs) {
        schedule = await getCachedPlayoffSchedule(seasonRecord.id, effectiveRound);
    }

    const neededTeamIds = new Set(
        schedule.flatMap(({ match }) =>
            [match.home_team_id, match.away_team_id].filter((id): id is string => !!id),
        ),
    );

    return (
        <MatchesPage
            season={seasonRecord}
            region={regionRecord}
            activeTab={activeTab}
            effectiveWeek={effectiveWeek}
            effectiveRound={effectiveRound}
            sortedRounds={sortedRounds}
            weekCounts={weekCounts}
            schedule={schedule}
            teams={allTeams.filter((t) => neededTeamIds.has(t.id))}
            standings={standings}
        />
    );
}
