import { Skeleton } from "@/app/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";

export default function ArchiveDetailLoading() {
    return (
        <div className="page-narrow space-y-6 py-6">
            {/* Back link */}
            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronLeft className="h-3.5 w-3.5" />
                <Skeleton className="h-3.5 w-24 rounded-sm" />
            </div>

            {/* Title + subtitle */}
            <div className="space-y-1.5">
                <Skeleton className="h-8 w-56 rounded-sm" />
                <Skeleton className="h-3.5 w-36 rounded-sm" />
            </div>

            {/* Generic content area — conservative height avoids CLS on transition */}
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-sm" />
                ))}
            </div>
        </div>
    );
}
