import {Skeleton} from "@/app/components/ui/skeleton";

export function StandingsTableSkeleton({rows = 12}: {rows?: number}) {
    return (
        <div aria-hidden className="mt-6">
            <div className="flex h-7 items-start border-b border-border">
                <Skeleton className="h-3 w-40 rounded-sm" />
            </div>
            {Array.from({length: rows}, (_, i) => (
                <Skeleton key={i} className="mt-2 h-9 w-full rounded-sm" />
            ))}
        </div>
    );
}

export function StandingsHeaderSkeleton() {
    return (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Standings</h1>
                <Skeleton className="mt-1.5 h-4 w-48 rounded-sm" />
            </div>
            <div className="flex min-h-11 items-center">
                <Skeleton className="h-4 w-36 rounded-sm" />
            </div>
        </div>
    );
}
