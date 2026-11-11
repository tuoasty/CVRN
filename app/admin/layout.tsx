import { Suspense } from "react";
import AdminNavbar from "@/app/components/admin/navigation/AdminNavbar";
import { AdminStoreInitializer } from "@/app/admin/AdminStoreInitializier";
import { AdminRoleProvider } from "@/app/admin/AdminRoleProvider";
import { createServerSupabase } from "@/server/supabase/server";
import { getUserRole } from "@/server/db/roles.repo";

async function getCurrentUserRole(): Promise<string | null> {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const role = await getUserRole(supabase, user.id);
    return role.ok ? role.value : null;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const userRole = await getCurrentUserRole();

    return (
        <AdminRoleProvider role={userRole}>
            <div className="min-h-screen flex flex-col bg-background">
                <Suspense fallback={
                    <header className="border-b border-border bg-card">
                        <div className="page-wide h-[52px]" />
                    </header>
                }>
                    <AdminNavbar userRole={userRole} />
                </Suspense>
                <AdminStoreInitializer>
                    <main className="flex-1">{children}</main>
                </AdminStoreInitializer>
            </div>
        </AdminRoleProvider>
    );
}
