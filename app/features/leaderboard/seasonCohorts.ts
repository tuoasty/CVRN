import type {PlayerLeaderboardRow} from "@/server/domains/player";

export type SeasonCohort = {

    slug: string;
    label: string;

    startedAt: string;

    regionCount: number;
};

export function deriveSeasonCohorts(rows: PlayerLeaderboardRow[]): SeasonCohort[] {
    const bySlug = new Map<string, {startedAt: string; regions: Set<string>}>();

    for (const row of rows) {
        if (!row.season_slug) continue;
        const entry = bySlug.get(row.season_slug);
        if (!entry) {
            bySlug.set(row.season_slug, {
                startedAt: row.season_start_date,
                regions: new Set([row.region_id]),
            });
            continue;
        }
        entry.regions.add(row.region_id);
        if (row.season_start_date > entry.startedAt) entry.startedAt = row.season_start_date;
    }

    return [...bySlug.entries()]
        .map(([slug, {startedAt, regions}]) => ({
            slug,
            label: cohortLabel(slug),
            startedAt,
            regionCount: regions.size,
        }))

        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function cohortLabel(slug: string): string {
    const digits = slug.match(/(\d+)\s*$/);
    return digits ? `Season ${Number(digits[1])}` : slug.toUpperCase();
}
