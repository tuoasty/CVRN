import { Skeleton } from "@/app/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";

export default function MatchDetailLoading() {
    return (
        <div className="page-wide py-6 space-y-4">
            {/* Back button */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronLeft className="h-3.5 w-3.5" />
                <Skeleton className="h-3.5 w-20 rounded-sm" />
            </div>

            {/* Match header — two logos + score center */}
            <div className="panel p-6">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 py-4">
                    {/* Home team */}
                    <div className="flex flex-col items-center gap-3">
                        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm" />
                        <Skeleton className="h-5 w-28 rounded-sm" />
                    </div>
                    {/* Score center */}
                    <div className="flex flex-col items-center gap-2 px-4">
                        <Skeleton className="h-8 w-20 rounded-sm" />
                        <Skeleton className="h-3 w-16 rounded-sm" />
                    </div>
                    {/* Away team */}
                    <div className="flex flex-col items-center gap-3">
                        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm" />
                        <Skeleton className="h-5 w-28 rounded-sm" />
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <Skeleton className="h-10 w-full rounded-sm" />

            {/* Box score placeholder */}
            <Skeleton className="h-64 w-full rounded-sm" />
        </div>
    );
}
