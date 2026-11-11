import {describe, expect, it} from "vitest";
import {ACCESS_GROUPS} from "@/shared/types/accessGroup";
import {OWNER_DISCORD_ID} from "@/shared/auth/owner";
import type {DiscordRoleGroupRow, UserAccountRow, UserGroupBlockRow} from "@/shared/types/db";
import {buildStaffPage} from "../buildStaffPage";

function mapping(role_id: string, group_name: DiscordRoleGroupRow["group_name"]): DiscordRoleGroupRow {
    return {role_id, group_name, updated_by: null, updated_at: "2026-11-11T00:00:00Z"};
}

function account(user_id: string, discord_user_id: string, role_ids: string[]): UserAccountRow {
    return {
        user_id,
        discord_user_id,
        discord_username: `u${user_id}`,
        discord_display_name: `User ${user_id}`,
        discord_avatar_url: null,
        role_ids,
        roles_valid_until: "2026-11-11T00:05:00Z",
        roles_verified_at: "2026-11-11T00:00:00Z",
        created_at: "2026-11-11T00:00:00Z",
        updated_at: "2026-11-11T00:00:00Z",
    };
}

function block(user_id: string, group_name: UserGroupBlockRow["group_name"]): UserGroupBlockRow {
    return {user_id, group_name, blocked_by: null, blocked_at: "2026-11-11T00:00:00Z"};
}

const discordRoles = [
    {id: "r1", name: "Board", position: 5, managed: false},
    {id: "r2", name: "Server Booster", position: 4, managed: true},
    {id: "r3", name: "Graphics", position: 3, managed: false},
];

describe("buildStaffPage", () => {
    it("lists only mapped roles, in Discord order, with their groups", () => {
        const page = buildStaffPage({
            discordRoles: [...discordRoles, {id: "r4", name: "Member", position: 1, managed: false}],
            mappings: [mapping("r3", "graphics"), mapping("r1", "admin")],
            accounts: [],
            blocks: [],
        });

        expect(page.roles).toEqual([
            {id: "r1", name: "Board", groups: ["admin"], deleted: false},
            {id: "r3", name: "Graphics", groups: ["graphics"], deleted: false},
        ]);
    });

    it("shows a managed role once it is mapped so it can be unmapped", () => {
        const page = buildStaffPage({discordRoles, mappings: [mapping("r2", "media")], accounts: [], blocks: []});

        expect(page.roles.map(r => r.id)).toEqual(["r2"]);
    });

    it("lists every guild role for lookup by ID, managed ones flagged", () => {
        const page = buildStaffPage({discordRoles, mappings: [], accounts: [], blocks: []});

        expect(page.guildRoles).toEqual([
            {id: "r1", name: "Board", managed: false},
            {id: "r2", name: "Server Booster", managed: true},
            {id: "r3", name: "Graphics", managed: false},
        ]);
    });

    it("marks a mapped role Discord no longer has as deleted", () => {
        const page = buildStaffPage({discordRoles, mappings: [mapping("gone", "admin")], accounts: [], blocks: []});

        expect(page.roles.at(-1)).toEqual({id: "gone", name: null, groups: ["admin"], deleted: true});
    });

    it("account groups come from role ids and the mapping, minus per-group blocks", () => {
        const page = buildStaffPage({
            discordRoles,
            mappings: [mapping("r1", "admin"), mapping("r1", "awards"), mapping("r3", "graphics")],
            accounts: [account("a", "100", ["r1", "r3"])],
            blocks: [block("a", "awards")],
        });

        expect(page.accounts[0]).toMatchObject({userId: "a", groups: ["admin", "graphics"], blocked: ["awards"], isOwner: false});
    });

    it("Block all empties groups and reports all", () => {
        const page = buildStaffPage({
            discordRoles,
            mappings: [mapping("r1", "admin")],
            accounts: [account("a", "100", ["r1"])],
            blocks: [block("a", null), block("a", "admin")],
        });

        expect(page.accounts[0]).toMatchObject({groups: [], blocked: "all"});
    });

    it("the owner has every group and no blocks", () => {
        const page = buildStaffPage({
            discordRoles,
            mappings: [],
            accounts: [account("o", OWNER_DISCORD_ID, [])],
            blocks: [block("o", null)],
        });

        expect(page.accounts[0]).toMatchObject({groups: [...ACCESS_GROUPS], blocked: null, isOwner: true});
    });
});
