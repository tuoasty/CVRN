import {Skeleton} from "@/app/components/ui/skeleton";

function TableSkeleton({rows = 2}: {rows?: number}) {
    return (
        <div className="panel overflow-hidden">
            {/* header row */}
            <div className="grid grid-cols-4 gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-16" />
            </div>
            {/* data rows */}
            {Array.from({length: rows}).map((_, i) => (
                <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-border last:border-0">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-20" />
                </div>
            ))}
        </div>
    );
}

export default function PlayerPageLoading() {
    return (
        <div className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">
            {/* Back */}
            <Skeleton className="h-5 w-16" />

            {/* Header */}
            <div className="flex gap-1 items-end">
                <Skeleton className="w-14 h-14 sm:w-20 sm:h-20 shrink-0 self-start rounded-sm" />
                <Skeleton className="w-[140px] h-[140px] sm:w-[200px] sm:h-[200px] shrink-0 rounded-sm" />
                <div className="flex flex-col gap-2 pl-3 sm:pl-8 pb-2 flex-1 min-w-0">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-36 sm:h-8 sm:w-48" />
                    <Skeleton className="h-4 w-24 mt-1" />
                </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-9 w-40" />
                </div>
                <Skeleton className="h-32 w-full rounded-sm" />
            </div>

            {/* Achievements */}
            <div className="space-y-3 max-w-2xl">
                <Skeleton className="h-5 w-28" />
                <TableSkeleton rows={1} />
            </div>

            {/* Awards */}
            <div className="space-y-3 max-w-2xl">
                <Skeleton className="h-5 w-16" />
                <TableSkeleton rows={1} />
            </div>

            {/* Team history */}
            <div className="space-y-3">
                <Skeleton className="h-5 w-28" />
                <div className="panel divide-y divide-border">
                    {Array.from({length: 2}).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                            <Skeleton className="w-1 self-stretch rounded-full shrink-0" />
                            <Skeleton className="w-7 h-7 rounded-sm shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-5 w-16 rounded-sm" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
