export const ROLE_TTL_MS = 300000;
export const ROLE_GRACE_MS = 3600000;

export type MemberLookup =
    | {kind: "member"; roles: string[]}
    | {kind: "not_member"}
    | {kind: "error"};

export type RoleState = {
    roleIds: string[];
    rolesVerifiedAt: string | null;
    rolesValidUntil: string | null;
};

export function nextRoleValidity(lookup: MemberLookup, current: RoleState | null, now: Date): RoleState {
    const freshUntil = new Date(now.getTime() + ROLE_TTL_MS).toISOString();

    if (lookup.kind === "member") {
        return {roleIds: lookup.roles, rolesVerifiedAt: now.toISOString(), rolesValidUntil: freshUntil};
    }

    if (lookup.kind === "not_member") {
        return {roleIds: [], rolesVerifiedAt: now.toISOString(), rolesValidUntil: freshUntil};
    }

    if (!current) return {roleIds: [], rolesVerifiedAt: null, rolesValidUntil: null};

    const verifiedAt = current.rolesVerifiedAt ? new Date(current.rolesVerifiedAt).getTime() : null;
    const withinGrace = verifiedAt !== null && now.getTime() - verifiedAt < ROLE_GRACE_MS;

    return withinGrace ? {...current, rolesValidUntil: freshUntil} : current;
}
