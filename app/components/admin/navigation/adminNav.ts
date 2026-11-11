export type AdminNavPage = { href: string; label: string; superAdminOnly?: boolean };
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
            { href: "/admin/cache", label: "Cache", superAdminOnly: true },
            { href: "/admin/staff", label: "Staff", superAdminOnly: true },
            { href: "/admin/invite", label: "Invite", superAdminOnly: true },
        ],
    },
];

const ALLOWED_HREFS: Record<string, Set<string>> = {
    stat_tracker: new Set(["/admin/sync/history"]),
    staff: new Set(["/admin/teams", "/admin/sync/history"]),
    spec_manager: new Set(["/admin/specs", "/admin/specs/qualify", "/admin/game-data"]),
    information_manager: new Set(["/admin/game-data"]),
    none: new Set(),
};

const HREF_OVERRIDES: Record<string, Record<string, string>> = {
    spec_manager: { "/admin/game-data": "/admin/game-data/specs" },
};

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

export function buildAdminNav(role: string | null | undefined): AdminNavModel {
    const allowed = role ? ALLOWED_HREFS[role] : undefined;
    const overrides = role ? HREF_OVERRIDES[role] : undefined;
    const isSuperAdmin = role === "super_admin";

    const visible = (pages: AdminNavPage[]) =>
        pages
            .filter(page => (!allowed || allowed.has(page.href)) && (!page.superAdminOnly || isSuperAdmin))
            .map(page => (overrides?.[page.href] ? { ...page, href: overrides[page.href] } : page));

    const primary = visible(PRIMARY_PAGES);
    const groups = GROUPS
        .map(group => ({ ...group, pages: visible(group.pages) }))
        .filter(group => group.pages.length > 0);

    const flat = [...primary, ...groups.flatMap(group => group.pages)];
    return flat.length <= FLAT_PAGE_LIMIT ? { primary: flat, groups: [] } : { primary, groups };
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
