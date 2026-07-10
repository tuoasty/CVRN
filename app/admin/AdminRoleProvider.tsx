"use client";

import {createContext, useContext} from "react";

const AdminRoleContext = createContext<string | null>(null);

/**
 * Seeds the current user's role (fetched server-side in the admin layout) so
 * client components can gate role-aware UI without re-querying user_roles.
 */
export function AdminRoleProvider({role, children}: {role: string | null; children: React.ReactNode}) {
    return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}

export function useUserRole(): string | null {
    return useContext(AdminRoleContext);
}

export function useIsSuperAdmin(): boolean {
    return useContext(AdminRoleContext) === "super_admin";
}
