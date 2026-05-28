import { cookies } from "next/headers";
import { unstable_serialize } from "swr";
import MatchesPage from "@/app/(public)/matches/MatchesPage";
import { SWRFallback } from "@/app/providers/SWRFallback";
import { getAllRegionsAction } from "@/app/actions/region.actions";
import { getAllSeasonsAction } from "@/app/actions/season.actions";
import { getDefaultWeekForSeasonAction, getWeekScheduleAction } from "@/app/actions/match.actions";

const SEASON_COOKIE = "cvrn_selected_season";

export default async function Page() {
    const cookieStore = await cookies();
    const savedSeasonId = cookieStore.get(SEASON_COOKIE)?.value ?? null;

    let seasonId: string | null = null;

    if (savedSeasonId) {
        seasonId = savedSeasonId;
    } else {
        const [regionsResult, seasonsResult] = await Promise.all([
            getAllRegionsAction(),
            getAllSeasonsAction(),
        ]);
        const regions = regionsResult.ok ? regionsResult.value : [];
        const seasons = seasonsResult.ok ? seasonsResult.value : [];

        if (regions.length > 0 && seasons.length > 0) {
            const asiaRegion = regions.find(r => r.code.toUpperCase() === "AS");
            const defaultRegion = asiaRegion ?? regions[0];
            const activeSeason = seasons.find(s => s.region_id === defaultRegion.id && s.is_active);
            const fallbackSeason = seasons
                .filter(s => s.region_id === defaultRegion.id)
                .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
            seasonId = (activeSeason ?? fallbackSeason)?.id ?? null;
        }
    }

    const fallback: Record<string, unknown> = {};

    if (seasonId) {
        const weekResult = await getDefaultWeekForSeasonAction(seasonId);
        if (weekResult.ok) {
            const defaultWeek = weekResult.value;
            const defaultWeekKey = unstable_serialize(["defaultWeek", seasonId]);
            fallback[defaultWeekKey] = defaultWeek;

            const scheduleResult = await getWeekScheduleAction({ seasonId, week: defaultWeek });
            if (scheduleResult.ok) {
                const weekScheduleKey = unstable_serialize(["weekSchedule", seasonId, defaultWeek]);
                fallback[weekScheduleKey] = scheduleResult.value;
            }
        }
    }

    return (
        <SWRFallback fallback={fallback}>
            <MatchesPage />
        </SWRFallback>
    );
}
