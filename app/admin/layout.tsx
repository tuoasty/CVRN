import { Suspense } from "react";
import AdminNavbar from "@/app/components/admin/navigation/AdminNavbar";
import { AdminStoreInitializer } from "@/app/admin/AdminStoreInitializier";
import { AdminRoleProvider } from "@/app/admin/AdminRoleProvider";
import { createServerSupabase } from "@/server/supabase/server";

// TODO: thread userRole through all admin pages for role-aware UI
async function getCurrentUserRole(): Promise<string | null> {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    return data?.role ?? null;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const userRole = await getCurrentUserRole();

    return (
        <AdminRoleProvider role={userRole}>
            <div className="min-h-screen flex flex-col bg-background">
                <Suspense fallback={
                    <header className="border-b border-border bg-card">
                        <div className="page-wide h-14" />
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
