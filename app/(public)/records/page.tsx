import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getCachedRecords, getCachedRegions, getCachedSeasons} from "@/server/cache/publicReads";
import {RecordsParamsSchema} from "@/server/domains/record";
import RecordsPage from "@/app/features/records/RecordsPage";
import {buildSeasonOptions} from "@/app/features/records/recordScopeParams";

export const metadata: Metadata = {
    title: "Records",
    description: "The best single-set, single-match and season performances in CVRN playoff history.",
};

export default async function RecordsRoute({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const parsed = RecordsParamsSchema.safeParse(await searchParams);
    if (!parsed.success) notFound();

    const region = parsed.data.region ?? null;
    const season = parsed.data.season ?? null;

    const [payload, seasons, regions] = await Promise.all([
        getCachedRecords(region, season),
        getCachedSeasons(),
        getCachedRegions(),
    ]);
    if (!payload) notFound();

    return (
        <RecordsPage
            payload={payload}
            seasonOptions={buildSeasonOptions(seasons, regions)}
            region={region}
            season={season}
        />
    );
}
