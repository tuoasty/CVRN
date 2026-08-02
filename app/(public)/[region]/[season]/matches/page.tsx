import { notFound } from "next/navigation";
import MatchesPage from "@/app/(public)/matches/MatchesPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedStandings,
    getCachedTeamsWithRegions,
    getCachedWeekSchedule,
    getCachedPlayoffSchedule,
    getCachedDefaultWeekForSeason,
    getCachedAvailablePlayoffRounds,
    getCachedPlayoffRoundCounts,
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

/**
 * Server-rendered matches schedule.
 *
 * This route previously rendered a client component with no props, which fetched
 * everything through nine SWR hooks — nine server-action POSTs per view, two of them
 * waterfalled behind the schedule resolving. All of that now happens in one render.
 *
 * Reading `searchParams` opts the route out of the Full Route Cache, which is deliberate:
 * a dynamic route produces no ISR entry and therefore no ISR write, and ISR writes are the
 * metric currently furthest over budget. The underlying reads are still cached, so the
 * per-request cost is a cache lookup rather than a round of queries.
 *
 * The week/round resolution below was previously client-side. It has to live here now
 * because the answer determines which schedule to fetch.
 */
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

    const activeTab = tab === "playoffs" ? "playoffs" : "season";
    const hasPlayoffs = !!seasonRecord.playoff_started;

    // Independent of each other and of the schedule, so resolve together. Playoff metadata
    // is skipped entirely when the season has no bracket yet.
    const [standings, allTeams, weekCounts, availableRounds, roundCounts] = await Promise.all([
        getCachedStandings(seasonRecord.id, regionRecord.id),
        getCachedTeamsWithRegions(),
        getCachedWeekMatchCounts(seasonRecord.id),
        hasPlayoffs ? getCachedAvailablePlayoffRounds(seasonRecord.id) : Promise.resolve([]),
        hasPlayoffs ? getCachedPlayoffRoundCounts(seasonRecord.id) : Promise.resolve([]),
    ]);

    // Week: an explicit ?week wins; otherwise fall back to the season's default week. The
    // default is only queried when it is actually needed, matching the old hook's `null` key.
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
    const roundParam: PlayoffRound | null = isPlayoffRound(rawRound) ? rawRound : null;
    const effectiveRound: PlayoffRound =
        roundParam && sortedRounds.includes(roundParam) ? roundParam : sortedRounds[0] ?? "play_in";

    // Only the active tab's schedule is fetched — the other one is never rendered.
    let schedule: MatchWithDetails[] = [];
    if (activeTab === "season") {
        schedule = await getCachedWeekSchedule(seasonRecord.id, effectiveWeek);
    } else if (hasPlayoffs) {
        schedule = await getCachedPlayoffSchedule(seasonRecord.id, effectiveRound);
    }

    // Teams come from the already-cached all-teams read rather than a per-id-set query —
    // filtering ~220 rows in memory is cheaper than minting a new cache entry for every
    // distinct set of team ids a week happens to contain.
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
            roundCounts={roundCounts}
            weekCounts={weekCounts}
            schedule={schedule}
            teams={allTeams.filter((t) => neededTeamIds.has(t.id))}
            standings={standings}
        />
    );
}
