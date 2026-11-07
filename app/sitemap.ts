import type { MetadataRoute } from "next";
import {
    getCachedRegions,
    getCachedSeasons,
    getCachedTeamsWithRegions,
    getCachedMatchSitemapRows,
    getCachedPublishedArticles,
    getCachedUpdateLogIndex,
} from "@/server/cache/publicReads";
import { buildArticleHref, buildPublicMatchHref, buildPublicTeamHref } from "@/app/utils/matchDetailHref";
import { SITE_URL } from "@/app/lib/siteUrl";
import { logger } from "@/server/utils/logger";

export const revalidate = 86400;

type Entry = MetadataRoute.Sitemap[number];

const SEASON_PAGES = ["standings", "matches", "teams", "media", "leaderboard"] as const;

function safe<T>(label: string, read: () => Promise<T[]>): Promise<T[]> {
    return read().catch((error) => {
        logger.error({ error }, `sitemap: failed to load ${label}`);
        return [];
    });
}

function entry(path: string, fields: Omit<Entry, "url"> = {}): Entry {
    return { url: `${SITE_URL}${path}`, ...fields };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [regions, seasons, teams, matches, articles, updateLogs] = await Promise.all([
        safe("regions", getCachedRegions),
        safe("seasons", getCachedSeasons),
        safe("teams", getCachedTeamsWithRegions),
        safe("matches", getCachedMatchSitemapRows),
        safe("articles", () => getCachedPublishedArticles()),
        safe("update logs", getCachedUpdateLogIndex),
    ]);

    const now = new Date();
    const regionCodeById = new Map(regions.map((r) => [r.id, r.code.toLowerCase()]));
    const seasonPath = new Map<string, { regionCode: string; seasonSlug: string }>();
    const entries: Entry[] = [
        entry("/", { changeFrequency: "daily", priority: 1 }),
        entry("/archive", { changeFrequency: "weekly", priority: 0.6 }),
        entry("/leaderboard", { changeFrequency: "weekly", priority: 0.6 }),
        entry("/information", { changeFrequency: "weekly", priority: 0.5 }),
        entry("/information/builds", { changeFrequency: "monthly", priority: 0.5 }),
        entry("/information/specs", { changeFrequency: "monthly", priority: 0.5 }),
        entry("/information/updates", { changeFrequency: "weekly", priority: 0.5 }),
        entry("/about", { changeFrequency: "monthly", priority: 0.3 }),
        entry("/privacy", { changeFrequency: "yearly", priority: 0.2 }),
        entry("/terms", { changeFrequency: "yearly", priority: 0.2 }),
    ];

    for (const season of seasons) {
        const regionCode = regionCodeById.get(season.region_id);
        if (!regionCode || !season.slug) continue;
        const seasonSlug = season.slug.toLowerCase();
        seasonPath.set(season.id, { regionCode, seasonSlug });

        const completed = !!season.end_date && new Date(season.end_date) < now;
        const base = `/${encodeURIComponent(regionCode)}/${encodeURIComponent(seasonSlug)}`;
        const fields: Omit<Entry, "url"> = {
            lastModified: season.updated_at,
            changeFrequency: completed ? "yearly" : "daily",
            priority: completed ? 0.5 : 0.9,
        };

        entries.push(entry(base, fields));
        for (const page of SEASON_PAGES) entries.push(entry(`${base}/${page}`, fields));
        if (season.playoff_started) entries.push(entry(`${base}/playoffs`, fields));
        if (completed) entries.push(entry(`${base}/archive`, { ...fields, priority: 0.6 }));
    }

    const teamNameById = new Map<string, string>();
    for (const team of teams) {
        teamNameById.set(team.id, team.name);
        const path = seasonPath.get(team.season_id);
        const href = path && buildPublicTeamHref({ ...path, teamSlug: team.slug });
        if (href) entries.push(entry(href, { changeFrequency: "weekly", priority: 0.6 }));
    }

    for (const match of matches) {
        const path = seasonPath.get(match.season_id);
        if (!path || !match.home_team_id || !match.away_team_id) continue;
        const href = buildPublicMatchHref({
            ...path,
            matchCode: match.match_code,
            homeTeamName: teamNameById.get(match.home_team_id),
            awayTeamName: teamNameById.get(match.away_team_id),
        });
        if (href) entries.push(entry(href, { lastModified: match.updated_at, changeFrequency: "monthly", priority: 0.4 }));
    }

    for (const article of articles) {
        entries.push(entry(buildArticleHref(article), {
            lastModified: article.published_at ?? article.created_at,
            changeFrequency: "monthly",
            priority: 0.6,
        }));
    }

    for (const log of updateLogs) {
        entries.push(entry(`/information/updates/${encodeURIComponent(log.version)}`, {
            lastModified: log.released_at,
            changeFrequency: "yearly",
            priority: 0.4,
        }));
    }

    return entries;
}
