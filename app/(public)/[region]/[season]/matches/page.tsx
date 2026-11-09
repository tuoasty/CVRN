import { notFound, redirect } from "next/navigation";
import MatchesPage from "@/app/(public)/matches/MatchesPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedStandings,
    getCachedTeamsWithRegionsIncludingInactive,
    getCachedWeekSchedule,
    getCachedSeasonPlayoffSchedule,
    getCachedDefaultWeekForSeason,
    getCachedWeekMatchCounts,
} from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import type { MatchWithDetails } from "@/server/domains/match";

type PageProps = {
    params: Promise<{ region: string; season: string }>;
    searchParams: Promise<{ tab?: string; week?: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
    const { region, season } = await params;
    const { tab, week: weekParam } = await searchParams;

    const regionRecord = await getCachedRegionByCode(safeDecodeURIComponent(region).toLowerCase());
    if (!regionRecord) notFound();

    const seasonRecord = await getCachedSeasonBySlugAndRegion(
        safeDecodeURIComponent(season).toLowerCase(),
        regionRecord.id,
    );
    if (!seasonRecord) notFound();

    const hasPlayoffs = !!seasonRecord.playoff_started;
    const activeTab: "season" | "playoffs" =
        tab === "playoffs" && hasPlayoffs ? "playoffs"
        : tab === "season" ? "season"
        : hasPlayoffs ? "playoffs" : "season";

    const [standings, allTeams, weekCounts] = await Promise.all([
        getCachedStandings(seasonRecord.id, regionRecord.id),
        getCachedTeamsWithRegionsIncludingInactive(),
        getCachedWeekMatchCounts(seasonRecord.id),
    ]);

    const parsedWeek = weekParam ? parseInt(weekParam, 10) : NaN;
    const effectiveWeek = Number.isFinite(parsedWeek)
        ? parsedWeek
        : activeTab === "season"
            ? await getCachedDefaultWeekForSeason(seasonRecord.id)
            : 1;

    if (tab !== activeTab || (activeTab === "season" && !Number.isFinite(parsedWeek))) {
        const canonical = new URLSearchParams({ tab: activeTab });
        if (activeTab === "season") canonical.set("week", String(effectiveWeek));
        redirect(`/${region}/${season}/matches?${canonical.toString()}`);
    }

    let matches: MatchWithDetails[] = [];
    let seeds: Record<string, number> = {};
    if (activeTab === "season") {
        matches = await getCachedWeekSchedule(seasonRecord.id, effectiveWeek);
    } else {
        const playoff = await getCachedSeasonPlayoffSchedule(seasonRecord.id);
        matches = playoff.matches;
        seeds = playoff.seeds;
    }

    const neededTeamIds = new Set(
        matches.flatMap(({ match }) =>
            [match.home_team_id, match.away_team_id].filter((id): id is string => !!id),
        ),
    );

    return (
        <MatchesPage
            season={seasonRecord}
            region={regionRecord}
            activeTab={activeTab}
            effectiveWeek={effectiveWeek}
            weeks={weekCounts.map(w => w.week).sort((a, b) => a - b)}
            matches={matches}
            seeds={seeds}
            teams={allTeams.filter((t) => neededTeamIds.has(t.id))}
            standings={standings}
        />
    );
}
