import AdminNavbar from "@/app/components/ui/AdminNavbar";

export default function AdminLayout({
                                        children,
                                    }: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            <AdminNavbar />
            <main className="admin-container">
                {children}
            </main>
        </div>
    );
}