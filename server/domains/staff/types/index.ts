import type {AccessGroup} from "@/shared/types/accessGroup";

export interface StaffRole {
    id: string;
    name: string | null;
    groups: AccessGroup[];
    deleted: boolean;
}

export type StaffBlocks = AccessGroup[] | "all" | null;

export interface StaffAccount {
    userId: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    groups: AccessGroup[];
    blocked: StaffBlocks;
    verifiedAt: string | null;
    isOwner: boolean;
}

export interface GuildRoleOption {
    id: string;
    name: string;
    managed: boolean;
}

export interface StaffPage {
    roles: StaffRole[];
    accounts: StaffAccount[];
    guildRoles: GuildRoleOption[];
}

export type {SetRoleGroupsInput, SaveRoleMappingInput, SetUserBlocksInput} from "./schemas";
export {SetRoleGroupsSchema, SaveRoleMappingSchema, SetUserBlocksSchema} from "./schemas";
