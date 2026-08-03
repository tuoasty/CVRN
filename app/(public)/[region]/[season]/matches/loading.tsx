import { Skeleton } from "@/app/components/ui/skeleton";
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader";
import { CalendarDays } from "lucide-react";

/**
 * Feedback for tab/week/round switches. The schedule now resolves on the server, so
 * changing `?week` is a navigation rather than a client fetch — this boundary replaces the
 * in-component SWR skeleton that used to cover it.
 *
 * The header renders for real (the title is static for this route) so it never shifts;
 * `PublicPageHeader` draws its own subtitle skeleton when none is passed. Card heights are
 * measured against `PublicMatchCard`, which is two very different layouts: a stacked card
 * below lg and a single 6-track row above it.
 */
export default function MatchesLoading() {
    return (
        <div className="page-wide space-y-6 py-6">
            <PublicPageHeader icon={CalendarDays} title="Matches" />

            <div className="space-y-4">
                <Skeleton className="h-[38px] w-full rounded-sm" />
                <Skeleton className="h-11 sm:h-[38px] w-full rounded-sm" />
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-[199px] sm:h-[207px] lg:h-20 w-full rounded-sm" />
                    ))}
                </div>
            </div>
        </div>
    );
}
