import { Skeleton } from "@/app/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

export default function MatchesLoading() {
    return (
        <div className="page-wide space-y-6 py-6">
            {}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                    <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-24 rounded-sm" />
                    <Skeleton className="h-3 w-48 rounded-sm" />
                </div>
            </div>

            <div className="space-y-4">
                {}
                <Skeleton className="h-10 w-full rounded-sm" />
                {}
                <Skeleton className="h-[52px] w-full rounded-sm" />
                {}
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-48 w-full rounded-sm" />
                    ))}
                </div>
            </div>
        </div>
    );
}
