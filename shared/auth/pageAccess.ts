import type {AccessGroup} from "@/shared/types/accessGroup";

export type PageAccessEntry = { prefix: string; groups: AccessGroup[] };

export const PAGE_ACCESS: PageAccessEntry[] = [
    { prefix: "/admin/dashboard", groups: ["admin", "graphics", "media"] },
    { prefix: "/admin/teams", groups: ["admin", "transaction"] },
    { prefix: "/admin/teams/*", groups: ["admin"] },
    { prefix: "/admin/matches", groups: ["admin", "graphics", "media"] },
    { prefix: "/admin/matches/*", groups: ["admin"] },
    { prefix: "/admin/media", groups: ["admin", "graphics", "media"] },
    { prefix: "/admin/standings", groups: ["admin"] },
    { prefix: "/admin/playoffs", groups: ["admin"] },
    { prefix: "/admin/seasons", groups: ["admin", "awards"] },
    { prefix: "/admin/seasons/*/results", groups: ["admin", "awards"] },
    { prefix: "/admin/stats", groups: ["admin", "statistics"] },
    { prefix: "/admin/articles", groups: ["admin", "articles"] },
    { prefix: "/admin/updates", groups: ["admin"] },
    { prefix: "/admin/game-data/import", groups: ["admin"] },
    { prefix: "/admin/game-data", groups: ["admin", "information"] },
    { prefix: "/admin/game-data/specs", groups: ["admin", "information"] },
    { prefix: "/admin/specs", groups: ["admin", "specs"] },
    { prefix: "/admin/specs/qualify", groups: ["admin", "specs"] },
    { prefix: "/admin/overalls", groups: ["admin", "player_cards"] },
    { prefix: "/admin/cards", groups: ["admin", "player_cards"] },
    { prefix: "/admin/sync", groups: ["admin", "transaction"] },
    { prefix: "/admin/sync/history", groups: ["admin", "transaction"] },
    { prefix: "/admin/audit", groups: ["admin"] },
    { prefix: "/admin/game-api", groups: ["admin"] },
    { prefix: "/admin/cache", groups: ["super_admin"] },
    { prefix: "/admin/staff", groups: ["super_admin"] },
];

export const LANDING_ORDER = [
    "/admin/dashboard",
    "/admin/teams",
    "/admin/stats",
    "/admin/articles",
    "/admin/game-data",
    "/admin/specs",
    "/admin/overalls",
    "/admin/seasons",
];

const UNMATCHED_ADMIN_GROUPS: AccessGroup[] = ["admin"];

function segments(path: string): string[] {
    return path.split("/").filter(Boolean);
}

function matches(entry: string[], path: string[]): boolean {
    return entry.length <= path.length && entry.every((segment, i) => segment === "*" || segment === path[i]);
}

function allowedGroupsFor(pathname: string): AccessGroup[] {
    const path = segments(pathname);
    let best: { length: number; groups: AccessGroup[] } | null = null;
    for (const entry of PAGE_ACCESS) {
        const parts = segments(entry.prefix);
        if (matches(parts, path) && (!best || parts.length > best.length)) {
            best = { length: parts.length, groups: entry.groups };
        }
    }
    return best?.groups ?? UNMATCHED_ADMIN_GROUPS;
}

export function canAccessPath(groups: readonly AccessGroup[], pathname: string): boolean {
    if (groups.includes("super_admin")) return true;
    if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return true;
    return allowedGroupsFor(pathname).some(group => groups.includes(group));
}

export function landingFor(groups: readonly AccessGroup[]): string {
    return LANDING_ORDER.find(path => canAccessPath(groups, path)) ?? "/";
}
