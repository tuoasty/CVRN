import {PublicPageHeaderSkeleton} from "@/app/components/public/PublicPageHeader";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function MediaLoading() {
    return (
        <div className="page-wide py-6 space-y-6">
            <PublicPageHeaderSkeleton titleWidth="w-24" />
            <div className="flex gap-1.5">
                <Skeleton className="h-6 w-10 rounded-sm" />
                <Skeleton className="h-6 w-24 rounded-sm" />
            </div>
            <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="panel flex overflow-hidden gap-0">
                        <Skeleton className="w-48 sm:w-64 flex-shrink-0 aspect-video rounded-none" />
                        <div className="flex-1 p-4 space-y-2">
                            <Skeleton className="h-4 w-16 rounded-sm" />
                            <Skeleton className="h-5 w-3/4 rounded-sm" />
                            <Skeleton className="h-3 w-1/2 rounded-sm" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
