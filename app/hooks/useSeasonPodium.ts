import useSWR, { type BareFetcher } from "swr";
import { getSeasonPodiumAction } from "@/app/actions/season.actions";
import { SeasonPodiumEntryWithTeam } from "@/server/domains/season";

async function fetchSeasonPodium([, seasonId]: [string, string]): Promise<SeasonPodiumEntryWithTeam[]> {
    const result = await getSeasonPodiumAction({ seasonId });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useSeasonPodium(seasonId: string | null) {
    const { data, isLoading } = useSWR(
        seasonId ? (["seasonPodium", seasonId] as const) : null,
        fetchSeasonPodium as BareFetcher<SeasonPodiumEntryWithTeam[]>,
        { revalidateOnFocus: false }
    );
    return { podium: (data as SeasonPodiumEntryWithTeam[] | undefined) ?? [], isLoading };
}
