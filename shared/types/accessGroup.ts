export const ACCESS_GROUPS = [
    "super_admin",
    "admin",
    "transaction",
    "graphics",
    "media",
    "articles",
    "information",
    "statistics",
    "specs",
    "player_cards",
    "awards",
] as const;

export type AccessGroup = typeof ACCESS_GROUPS[number];

export function isAccessGroup(value: unknown): value is AccessGroup {
    return typeof value === "string" && (ACCESS_GROUPS as readonly string[]).includes(value);
}
