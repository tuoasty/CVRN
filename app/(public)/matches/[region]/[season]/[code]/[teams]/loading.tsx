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

            {/* MatchHeader panel */}
            <div className="panel p-4 sm:p-6 space-y-4">
                {/* Metadata row: match code/round label + badges + date */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-border">
                    <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-3 w-24 rounded-sm" />
                        <div className="flex items-center gap-1.5">
                            <Skeleton className="h-5 w-20 rounded-sm" />
                            <Skeleton className="h-5 w-12 rounded-sm" />
                        </div>
                    </div>
                    <Skeleton className="h-3 w-24 rounded-sm shrink-0" />
                </div>

                {/* Team matchup grid */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 py-2 sm:py-3">
                    <div className="flex flex-col items-center gap-2">
                        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm" />
                        <Skeleton className="h-5 w-28 rounded-sm" />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 px-1 sm:px-2">
                        <Skeleton className="h-10 w-8 sm:h-12 sm:w-10 rounded-sm" />
                        <span className="text-2xl sm:text-3xl text-muted-foreground/20">−</span>
                        <Skeleton className="h-10 w-8 sm:h-12 sm:w-10 rounded-sm" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm" />
                        <Skeleton className="h-5 w-28 rounded-sm" />
                    </div>
                </div>

                {/* Set chips row */}
                <div className="flex items-center justify-center gap-1.5">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-7 w-14 rounded-sm" />
                    ))}
                </div>
            </div>

            {/* Tabs row: TabsList + StatViewToggle */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="flex gap-0.5">
                        <Skeleton className="h-9 w-16 rounded-sm" />
                        <Skeleton className="h-9 w-14 rounded-sm" />
                        <Skeleton className="h-9 w-14 rounded-sm" />
                    </div>
                    <Skeleton className="h-9 w-28 rounded-sm" />
                </div>

                {/* TeamSelectorBar */}
                <Skeleton className="h-9 w-full rounded-sm" />

                {/* BoxScore */}
                <Skeleton className="h-72 w-full rounded-sm" />
            </div>
        </div>
    );
}
