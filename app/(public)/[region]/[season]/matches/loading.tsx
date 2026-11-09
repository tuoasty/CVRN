import { Skeleton } from "@/app/components/ui/skeleton";

function DaySkeleton() {
    return (
        <div className="mt-5">
            <Skeleton className="h-4 w-28 rounded-sm" />
            <div className="mt-2 border-t border-border">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="mt-2 h-[52px] w-full rounded-sm sm:h-14" />
                ))}
            </div>
        </div>
    );
}

export default function MatchesLoading() {
    return (
        <div className="page-wide py-6">
            <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
            <Skeleton className="mt-1.5 h-4 w-48 rounded-sm" />
            <div className="mt-5 flex min-h-[57px] items-center border-b border-border">
                <Skeleton className="h-6 w-56 rounded-sm" />
            </div>
            <Skeleton className="mt-6 h-7 w-32 rounded-sm" />
            <DaySkeleton />
            <DaySkeleton />
        </div>
    );
}
