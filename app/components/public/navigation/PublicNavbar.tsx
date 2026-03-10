import Link from "next/link";
import { ModeToggle } from "@/app/components/ui/ModeToggle";
import PublicNavItems from "@/app/components/public/navigation/PublicNavItems";
import RegionSeasonSelector from "@/app/components/ui/RegionSeasonSelector";
import UserButton from "@/app/components/ui/UserButton";

export default function PublicNavbar() {
    return (
        <header className="sticky top-0 z-50 border-b border-border bg-card">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Desktop: Single Row */}
                <div className="hidden lg:flex items-center justify-between py-3">
                    <div className="flex items-center gap-8">
                        <Link href="/app/components/public">
                            <h1 className="text-lg font-semibold tracking-tight">
                                CVRN
                            </h1>
                        </Link>
                        <PublicNavItems />
                    </div>

                    <div className="flex items-center gap-3">
                        <RegionSeasonSelector />
                        <div className="h-6 w-px bg-border" />
                        <ModeToggle />
                        <div className="h-6 w-px bg-border" />
                        <UserButton />
                    </div>
                </div>

                {/* Mobile/Tablet: Two Rows */}
                <div className="lg:hidden">
                    {/* Top Row */}
                    <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                        <Link href="/app/components/public">
                            <h1 className="text-lg font-semibold tracking-tight">
                                CVRN
                            </h1>
                        </Link>

                        <div className="flex items-center gap-2">
                            <RegionSeasonSelector />
                            <div className="hidden sm:block h-6 w-px bg-border" />
                            <UserButton />
                            <div className="hidden sm:block h-6 w-px bg-border" />
                            <ModeToggle />
                        </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-center justify-center py-2">
                        <PublicNavItems />
                    </div>
                </div>
            </div>
        </header>
    );
}