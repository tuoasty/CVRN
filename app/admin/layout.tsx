import { Suspense } from "react";
import AdminNavbar from "@/app/components/admin/navigation/AdminNavbar";
import { AdminStoreInitializer } from "@/app/admin/AdminStoreInitializier";
import { AdminRoleProvider } from "@/app/admin/AdminRoleProvider";
import { createServerSupabase } from "@/server/supabase/server";
import { getCurrentGroups } from "@/server/domains/auth/queries/getCurrentGroups";
import type { AccessGroup } from "@/shared/types/accessGroup";

async function getGroups(): Promise<AccessGroup[]> {
    const supabase = await createServerSupabase();
    const groups = await getCurrentGroups(supabase);
    return groups.ok ? groups.value : [];
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const groups = await getGroups();

    return (
        <AdminRoleProvider groups={groups}>
            <div className="min-h-screen flex flex-col bg-background">
                <Suspense fallback={
                    <header className="border-b border-border bg-card">
                        <div className="page-wide h-[52px]" />
                    </header>
                }>
                    <AdminNavbar />
                </Suspense>
                <AdminStoreInitializer>
                    <main className="flex-1">{children}</main>
                </AdminStoreInitializer>
            </div>
        </AdminRoleProvider>
    );
}
