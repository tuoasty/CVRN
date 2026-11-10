import type {Region} from "@/shared/types/db";
import type {SeasonWithPlayoffConfig} from "@/server/domains/season";
import type {StandingsTableModel} from "@/app/features/standings/model/types";
import {StandingsView} from "@/app/features/standings/StandingsView";

type Props = {
    season: SeasonWithPlayoffConfig;
    region: Region;
    model: StandingsTableModel;
};

export default function StandingsPage({season, region, model}: Props) {
    return (
        <div className="page-wide py-6">
            <h1 className="text-2xl font-semibold tracking-tight">Standings</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{season.name} · {region.name}</p>
            <div className="mt-6">
                <StandingsView model={model} regionCode={region.code} seasonSlug={season.slug} linkMode="public" />
            </div>
        </div>
    );
}
