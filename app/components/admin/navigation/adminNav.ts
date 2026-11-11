import type { AccessGroup } from "@/shared/types/accessGroup";
import { canAccessPath } from "@/shared/auth/pageAccess";

export type AdminNavPage = { href: string; label: string };
export type AdminNavGroup = { label: string; pages: AdminNavPage[] };
export type AdminNavModel = { primary: AdminNavPage[]; groups: AdminNavGroup[] };

const PRIMARY_PAGES: AdminNavPage[] = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/teams", label: "Teams" },
    { href: "/admin/matches", label: "Matches" },
    { href: "/admin/media", label: "Media" },
];

const GROUPS: AdminNavGroup[] = [
    {
        label: "League",
        pages: [
            { href: "/admin/standings", label: "Standings" },
            { href: "/admin/playoffs", label: "Playoffs" },
            { href: "/admin/stats", label: "Match Stats" },
            { href: "/admin/seasons", label: "Seasons" },
        ],
    },
    {
        label: "Content",
        pages: [
            { href: "/admin/articles", label: "Articles" },
            { href: "/admin/updates", label: "Updates" },
            { href: "/admin/game-data", label: "Information" },
        ],
    },
    {
        label: "Ratings",
        pages: [
            { href: "/admin/specs", label: "Specs" },
            { href: "/admin/specs/qualify", label: "Spec Calibration" },
            { href: "/admin/overalls", label: "Overalls" },
            { href: "/admin/cards", label: "Player Cards" },
            { href: "/admin/cards/groups", label: "Card Groups" },
        ],
    },
    {
        label: "System",
        pages: [
            { href: "/admin/sync", label: "Sync" },
            { href: "/admin/sync/history", label: "Sync History" },
            { href: "/admin/cache", label: "Cache" },
            { href: "/admin/staff", label: "Staff" },
        ],
    },
];

const FLAT_PAGE_LIMIT = 3;

const REGION_SEASON_PICKER_PATHS = new Set([
    "/admin/matches",
    "/admin/media",
    "/admin/stats",
    "/admin/standings",
    "/admin/playoffs",
    "/admin/articles",
    "/admin/specs/qualify",
]);

export function buildAdminNav(groups: readonly AccessGroup[]): AdminNavModel {
    const visible = (pages: AdminNavPage[]) =>
        pages.filter(page => canAccessPath(groups, page.href));

    const primary = visible(PRIMARY_PAGES);
    const navGroups = GROUPS
        .map(group => ({ ...group, pages: visible(group.pages) }))
        .filter(group => group.pages.length > 0);

    const flat = [...primary, ...navGroups.flatMap(group => group.pages)];
    return flat.length <= FLAT_PAGE_LIMIT ? { primary: flat, groups: [] } : { primary, groups: navGroups };
}

export function adminNavHrefs(model: AdminNavModel): string[] {
    return [...model.primary, ...model.groups.flatMap(group => group.pages)].map(page => page.href);
}

export function findCurrentHref(pathname: string, hrefs: string[]): string | null {
    return hrefs
        .filter(href => pathname === href || pathname.startsWith(`${href}/`))
        .reduce<string | null>((longest, href) => (!longest || href.length > longest.length ? href : longest), null);
}

export function showsRegionSeasonPicker(pathname: string): boolean {
    return REGION_SEASON_PICKER_PATHS.has(pathname);
}
