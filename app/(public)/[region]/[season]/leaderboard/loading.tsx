import {Skeleton} from "@/app/components/ui/skeleton";

// Mirrors LeaderboardPage's shell: header, view selector row, table.
export default function LeaderboardLoading() {
    return (
        <div className="page-bleed py-6 space-y-6">
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-sm" />
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-40 rounded-sm" />
                    <Skeleton className="h-3 w-56 rounded-sm" />
                </div>
            </div>

            <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-9 w-full max-w-md rounded-lg" />
                <Skeleton className="h-4 w-20 rounded-sm" />
            </div>

            <div className="border border-border rounded-sm overflow-hidden">
                <Skeleton className="h-14 w-full rounded-none" />
                {Array.from({length: 12}).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 border-t border-border/30 px-2 py-2">
                        <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                        <Skeleton className="h-4 w-40 rounded-sm" />
                        <Skeleton className="h-4 flex-1 rounded-sm" />
                    </div>
                ))}
            </div>
        </div>
    );
}
