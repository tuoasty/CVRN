import {Suspense} from "react";
import MatchList from "@/app/features/matches/CreateMatchesForm";
import RobloxPlayerSearch from "@/app/features/players/RobloxPlayerSearch";
import {ModeToggle} from "@/app/components/ui/ModeToggle";
import RedirectCleaner from "@/app/components/providers/RedirectCleaner";

export default function PublicHome() {
    return (
        <main className="min-h-screen bg-background text-foreground p-6 space-y-6">
            <Suspense fallback={null}>
                <RedirectCleaner/>
            </Suspense>
            <ModeToggle/>
            <h1 className="text-2xl font-semibold">
                Public Page
            </h1>

            <div className="rounded-lg border border-border bg-card p-4">
                <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
                    <MatchList />
                </Suspense>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
                <RobloxPlayerSearch />
            </div>
        </main>
    );
}
