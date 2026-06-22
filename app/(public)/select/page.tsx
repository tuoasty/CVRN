import LeagueGrid from "@/app/components/public/landing/LeagueGrid";
import { getAllSeasonsAction } from "@/app/actions/season.actions";
import { getAllRegionsAction } from "@/app/actions/region.actions";

const NEXT_PAGES = new Set(["matches", "standings", "playoffs", "teams", "media"]);

export default async function SelectLeaguePage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string }>;
}) {
    const { next } = await searchParams;
    const nextPage = next && NEXT_PAGES.has(next) ? next : undefined;

    const [regionsResult, seasonsResult] = await Promise.all([
        getAllRegionsAction(),
        getAllSeasonsAction(),
    ]);
    const regions = regionsResult.ok ? regionsResult.value : [];
    const seasons = seasonsResult.ok ? seasonsResult.value : [];

    const byRegion = regions
        .map(r => ({
            region: r,
            seasons: seasons
                .filter(s => s.region_id === r.id)
                .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()),
        }))
        .filter(g => g.seasons.length > 0);

    return (
        <div className="page-wide py-12">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
                        Confederate Volleyball Roblox
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Select a League</h1>
                    <p className="text-sm text-muted-foreground">Choose a region and season to enter.</p>
                </div>
                <LeagueGrid byRegion={byRegion} nextPage={nextPage} />
            </div>
        </div>
    );
}
