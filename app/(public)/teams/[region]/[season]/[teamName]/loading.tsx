import { Skeleton } from "@/app/components/ui/skeleton";

export default function TeamDetailLoading() {
    return (
        <div className="page-narrow space-y-6 py-6">
            {/* Back button */}
            <Skeleton className="h-8 w-24 rounded-sm" />

            {/* Hero banner */}
            <Skeleton className="h-40 w-full rounded-sm" />

            {/* Leadership cards */}
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
            </div>

            {/* Roster */}
            <div className="space-y-3">
                <Skeleton className="h-5 w-20 rounded-sm" />
                <div className="grid grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-md" />
                    ))}
                </div>
            </div>
        </div>
    );
}
