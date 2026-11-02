import { Skeleton } from "@/app/components/ui/skeleton";

function SkeletonRound({ rows }: { rows: number }) {
    return (
        <div className="mt-11 first-of-type:mt-4">
            <div className="flex min-h-7 items-center border-b border-border pb-2">
                <Skeleton className="h-4 w-16 rounded-sm" />
            </div>
            {Array.from({ length: rows }).map((_, index) => (
                <div
                    key={index}
                    className="grid h-10 grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 last:border-b-0"
                >
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-6 rounded-sm" />
                        <Skeleton className="h-6 w-6 rounded-sm" />
                    </div>
                    <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                    <Skeleton className="h-4 w-14 rounded-sm" />
                </div>
            ))}
        </div>
    );
}

export default function AdminDashboardSkeleton() {
    return (
        <div className="page-wide pb-24 pt-6">
            <Skeleton className="mb-5 h-8 w-36 rounded-sm" />
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="min-w-0">
                        <header className="flex items-center gap-2.5 border-b border-border pb-2 pt-2.5">
                            <Skeleton className="h-7 w-8 rounded-sm" />
                            <Skeleton className="h-4 w-20 rounded-sm" />
                            <Skeleton className="ml-auto h-4 w-14 rounded-sm" />
                        </header>
                        <SkeletonRound rows={4} />
                        <SkeletonRound rows={3} />
                    </div>
                ))}
            </div>
        </div>
    );
}
