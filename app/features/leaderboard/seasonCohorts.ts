import type {PlayerLeaderboardRow} from "@/server/domains/player";

export type SeasonCohort = {
    /** The season slug, shared by every region running that cohort (`s3`). */
    slug: string;
    label: string;
    /** Latest start date across regions, for ordering. */
    startedAt: string;
    /** How many regions ran this cohort. Surfaced so a partial one is not a surprise. */
    regionCount: number;
};

/**
 * A cohort is a season SLUG, not a season row.
 *
 * Regions run concurrent seasons under matching slugs — AS `s3` and NA `s3` are the same
 * cohort — so the slug is what makes "Season 3 everywhere" a meaningful selection. If a
 * region ever diverges from that convention its seasons split into their own cohorts
 * rather than merging wrongly, which is the safe direction to fail.
 */
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
        // Newest first: the current season is the one most readers want.
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/**
 * `s3` -> "Season 3". Sorting is done on the real start date rather than this number, so
 * a slug that does not match the convention only loses its pretty label, never its place.
 */
function cohortLabel(slug: string): string {
    const digits = slug.match(/(\d+)\s*$/);
    return digits ? `Season ${Number(digits[1])}` : slug.toUpperCase();
}
