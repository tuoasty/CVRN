import {isSeasonActive} from "@/server/domains/season/helpers/isSeasonActive";

const COLUMN_ORDER = ["AS", "NA", "EU", "SA"];

function columnRank(code: string): number {
    const rank = COLUMN_ORDER.indexOf(code.toUpperCase());
    return rank === -1 ? COLUMN_ORDER.length : rank;
}

export function pickDashboardSeasons<
    R extends {id: string; code: string},
    S extends {region_id: string; start_date: string | null; end_date: string | null},
>(regions: R[], seasons: S[]): {region: R; season: S}[] {
    const columns: {region: R; season: S}[] = [];

    for (const region of regions) {
        const [season] = seasons
            .filter(s => s.region_id === region.id && isSeasonActive(s))
            .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
        if (season) columns.push({region, season});
    }

    return columns.sort(
        (a, b) => columnRank(a.region.code) - columnRank(b.region.code) || a.region.code.localeCompare(b.region.code)
    );
}
