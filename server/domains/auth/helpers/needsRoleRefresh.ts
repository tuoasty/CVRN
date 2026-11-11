export const ROLE_REFRESH_LEAD_MS = 30000;

export function needsRoleRefresh(rolesValidUntil: string | null, now: Date): boolean {
    if (!rolesValidUntil) return true;
    return new Date(rolesValidUntil).getTime() - now.getTime() <= ROLE_REFRESH_LEAD_MS;
}
