"use client";

import {createContext, useContext} from "react";
import type {AccessGroup} from "@/shared/types/accessGroup";

const AdminRoleContext = createContext<readonly AccessGroup[]>([]);

export function AdminRoleProvider({groups, children}: {groups: AccessGroup[]; children: React.ReactNode}) {
    return <AdminRoleContext.Provider value={groups}>{children}</AdminRoleContext.Provider>;
}

export function useGroups(): readonly AccessGroup[] {
    return useContext(AdminRoleContext);
}

export function useHasGroup(...allowed: AccessGroup[]): boolean {
    const groups = useContext(AdminRoleContext);
    return groups.includes("super_admin") || allowed.some(group => groups.includes(group));
}

export function useIsSuperAdmin(): boolean {
    return useContext(AdminRoleContext).includes("super_admin");
}
