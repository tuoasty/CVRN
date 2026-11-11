import {ACCESS_GROUPS, type AccessGroup} from "@/shared/types/accessGroup";
import type {StaffRole} from "@/server/domains/staff/types";

export type RoleMappingChange = {roleId: string; groups: AccessGroup[]};

export type RoleMappingSavePlan = {
    changes: RoleMappingChange[];
    removed: StaffRole[];
    superAdminGrants: StaffRole[];
};

function canonical(groups: readonly AccessGroup[]): AccessGroup[] {
    return ACCESS_GROUPS.filter(g => groups.includes(g));
}

function sameGroups(a: readonly AccessGroup[], b: readonly AccessGroup[]): boolean {
    return a.length === b.length && a.every(g => b.includes(g));
}

export function planRoleMappingSave(
    saved: StaffRole[],
    added: StaffRole[],
    edits: Record<string, AccessGroup[]>,
): RoleMappingSavePlan {
    const plan: RoleMappingSavePlan = {changes: [], removed: [], superAdminGrants: []};
    const savedIds = new Set(saved.map(r => r.id));
    const candidates = [...added.filter(r => !savedIds.has(r.id)), ...saved];

    for (const role of candidates) {
        const before = savedIds.has(role.id) ? role.groups : [];
        const after = canonical(edits[role.id] ?? before);
        if (sameGroups(before, after)) continue;

        plan.changes.push({roleId: role.id, groups: after});
        if (after.length === 0) plan.removed.push(role);
        if (after.includes("super_admin") && !before.includes("super_admin")) plan.superAdminGrants.push(role);
    }

    return plan;
}
