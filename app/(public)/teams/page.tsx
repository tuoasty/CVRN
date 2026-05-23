import { cookies } from "next/headers";
import TeamsPage from "@/app/(public)/teams/TeamsPage";
import { SWRFallback } from "@/app/providers/SWRFallback";
import { getAllTeamsWithRegionsAction } from "@/app/actions/team.actions";
import { getAllRegionsAction } from "@/app/actions/region.actions";
import { getAllSeasonsAction } from "@/app/actions/season.actions";

const SEASON_COOKIE = "cvrn_selected_season";

export default async function Page() {
    const cookieStore = await cookies();
    const savedSeasonId = cookieStore.get(SEASON_COOKIE)?.value ?? null;

    const [teamsResult, regionsResult, seasonsResult] = await Promise.all([
        getAllTeamsWithRegionsAction(),
        getAllRegionsAction(),
        getAllSeasonsAction(),
    ]);

    const allTeams = teamsResult.ok ? teamsResult.value : [];
    const regions = regionsResult.ok ? regionsResult.value : [];
    const seasons = seasonsResult.ok ? seasonsResult.value : [];

    let initialSeasonId: string | null = null;

    if (regions.length > 0 && seasons.length > 0) {
        if (savedSeasonId) {
            const saved = seasons.find(s => s.id === savedSeasonId);
            if (saved) initialSeasonId = saved.id;
        }

        if (!initialSeasonId) {
            const asiaRegion = regions.find(r => r.code.toUpperCase() === "AS");
            const defaultRegion = asiaRegion ?? regions[0];
            const activeSeason = seasons.find(s => s.region_id === defaultRegion.id && s.is_active);
            const fallbackSeason = seasons
                .filter(s => s.region_id === defaultRegion.id)
                .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
            initialSeasonId = (activeSeason ?? fallbackSeason)?.id ?? null;
        }
    }

    return (
        <SWRFallback fallback={{ teams: allTeams }}>
            <TeamsPage initialSeasonId={initialSeasonId} />
        </SWRFallback>
    );
}
