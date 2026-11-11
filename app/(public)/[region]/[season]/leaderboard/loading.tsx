import {PublicPageHeaderSkeleton} from "@/app/components/public/PublicPageHeader";
import {Skeleton} from "@/app/components/ui/skeleton";

export default function LeaderboardLoading() {
    return (
        <div className="page-bleed py-6 space-y-6">
            <PublicPageHeaderSkeleton titleWidth="w-40" />

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
