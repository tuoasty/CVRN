import { cookies } from "next/headers";
import { unstable_serialize } from "swr";
import StandingsPage from "@/app/(public)/standings/StandingsPage";
import { SWRFallback } from "@/app/providers/SWRFallback";
import { getStandingsAction } from "@/app/actions/standing.actions";
import { getAllSeasonsAction } from "@/app/actions/season.actions";

const SEASON_COOKIE = "cvrn_selected_season";

export default async function Page() {
    const cookieStore = await cookies();
    const savedSeasonId = cookieStore.get(SEASON_COOKIE)?.value ?? null;

    let fallback: Record<string, unknown> = {};

    if (savedSeasonId) {
        const seasonsResult = await getAllSeasonsAction();
        if (seasonsResult.ok) {
            const season = seasonsResult.value.find(s => s.id === savedSeasonId);
            if (season) {
                const standingsResult = await getStandingsAction({
                    seasonId: savedSeasonId,
                    regionId: season.region_id,
                });
                if (standingsResult.ok) {
                    const key = unstable_serialize(["standings", savedSeasonId, season.region_id]);
                    fallback = { [key]: standingsResult.value };
                }
            }
        }
    }

    return (
        <SWRFallback fallback={fallback}>
            <StandingsPage />
        </SWRFallback>
    );
}
