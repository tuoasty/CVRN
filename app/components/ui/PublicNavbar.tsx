import Link from "next/link";
import { ModeToggle } from "@/app/components/ui/ModeToggle";
import PublicNavItems from "@/app/components/ui/PublicNavItems";
import RegionSeasonSelector from "@/app/components/ui/RegionSeasonSelector";
import UserButton from "@/app/components/ui/UserButton";

export default function PublicNavbar() {
    return (
        <header className="sticky top-0 z-50 border-b border-border bg-card">
            <div className="max-w-7xl mx-auto px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/">
                            <h1 className="text-lg font-semibold tracking-tight">
                                CVRN
                            </h1>
                        </Link>

                        <PublicNavItems />
                    </div>

                    <div className="flex items-center gap-3">
                        <RegionSeasonSelector />
                        <div className="h-6 w-px bg-border" />
                        <UserButton />
                        <div className="h-6 w-px bg-border" />
                        <ModeToggle />
                    </div>
                </div>
            </div>
        </header>
    );
}