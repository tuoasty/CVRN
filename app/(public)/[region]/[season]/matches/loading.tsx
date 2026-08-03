import { Skeleton } from "@/app/components/ui/skeleton";
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader";
import { CalendarDays } from "lucide-react";

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
