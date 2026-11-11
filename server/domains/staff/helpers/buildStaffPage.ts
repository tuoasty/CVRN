import {ACCESS_GROUPS, AccessGroup} from "@/shared/types/accessGroup";
import {OWNER_DISCORD_ID} from "@/shared/auth/owner";
import type {GuildRole} from "@/server/discord/client";
import type {DiscordRoleGroupRow, UserAccountRow, UserGroupBlockRow} from "@/shared/types/db";
import type {StaffAccount, StaffBlocks, StaffPage, StaffRole} from "../types";

type StaffPageInput = {
    discordRoles: GuildRole[];
    mappings: DiscordRoleGroupRow[];
    accounts: UserAccountRow[];
    blocks: UserGroupBlockRow[];
};

function inGroupOrder(groups: Set<AccessGroup>): AccessGroup[] {
    return ACCESS_GROUPS.filter(g => groups.has(g));
}

export function buildStaffPage({discordRoles, mappings, accounts, blocks}: StaffPageInput): StaffPage {
    const groupsByRole = new Map<string, Set<AccessGroup>>();
    for (const m of mappings) {
        const set = groupsByRole.get(m.role_id) ?? new Set<AccessGroup>();
        set.add(m.group_name);
        groupsByRole.set(m.role_id, set);
    }

    const liveIds = new Set(discordRoles.map(r => r.id));
    const roles: StaffRole[] = discordRoles
        .filter(r => groupsByRole.has(r.id))
        .map(r => ({id: r.id, name: r.name, groups: inGroupOrder(groupsByRole.get(r.id) ?? new Set()), deleted: false}));
    for (const [roleId, groups] of groupsByRole) {
        if (!liveIds.has(roleId)) roles.push({id: roleId, name: null, groups: inGroupOrder(groups), deleted: true});
    }

    const blocksByUser = new Map<string, (AccessGroup | null)[]>();
    for (const b of blocks) blocksByUser.set(b.user_id, [...(blocksByUser.get(b.user_id) ?? []), b.group_name]);

    const staff: StaffAccount[] = accounts.map(a => {
        const base = {
            userId: a.user_id,
            displayName: a.discord_display_name,
            username: a.discord_username,
            avatarUrl: a.discord_avatar_url,
            verifiedAt: a.roles_verified_at,
        };
        if (a.discord_user_id === OWNER_DISCORD_ID) {
            return {...base, groups: [...ACCESS_GROUPS], blocked: null, isOwner: true};
        }

        const userBlocks = blocksByUser.get(a.user_id) ?? [];
        const blockedAll = userBlocks.includes(null);
        const blockedGroups = new Set(userBlocks.filter((g): g is AccessGroup => g !== null));
        const blocked: StaffBlocks = blockedAll ? "all" : blockedGroups.size > 0 ? inGroupOrder(blockedGroups) : null;

        const granted = new Set<AccessGroup>();
        if (!blockedAll) {
            for (const roleId of a.role_ids) {
                for (const g of groupsByRole.get(roleId) ?? []) if (!blockedGroups.has(g)) granted.add(g);
            }
        }
        return {...base, groups: inGroupOrder(granted), blocked, isOwner: false};
    });

    return {
        roles,
        accounts: staff,
        guildRoles: discordRoles.map(r => ({id: r.id, name: r.name, managed: r.managed})),
    };
}
