import { Skeleton } from "@/app/components/ui/skeleton";

export default function TeamDetailLoading() {
    return (
        <div className="page-wide space-y-6 py-6">
            {/* Header — matches PublicTeamDetailPage.tsx header */}
            <div className="pt-2 pb-4">
                <Skeleton className="h-8 w-16 rounded-sm mb-4" />
                <div className="flex items-center gap-5">
                    {/* Logo square — w-36/h-36 mobile, w-44/h-44 sm */}
                    <Skeleton className="w-36 h-36 sm:w-44 sm:h-44 shrink-0 rounded-sm" />
                    {/* Text block */}
                    <div className="space-y-2 flex-1 min-w-0">
                        <Skeleton className="h-9 w-48 rounded-sm" />
                        <Skeleton className="h-3 w-32 rounded-sm" />
                        <Skeleton className="h-4 w-40 rounded-sm" />
                    </div>
                </div>
            </div>

            {/* Unified roster — matches grid grid-cols-3 sm:grid-cols-9 gap-2 sm:gap-3 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-14 rounded-sm" />
                    <Skeleton className="h-4 w-12 rounded-sm" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 sm:gap-3">
                    {[...Array(9)].map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-md" />
                    ))}
                </div>
            </div>
        </div>
    );
}
