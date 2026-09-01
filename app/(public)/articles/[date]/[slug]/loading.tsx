import { Skeleton } from "@/app/components/ui/skeleton"

export default function ArticlePageLoading() {
    return (
        <div className="page-narrow py-6 space-y-6">
            <Skeleton className="h-5 w-16" />

            <div className="space-y-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-3/4" />
                <div className="flex items-center gap-3">
                    <Skeleton className="w-6 h-6 rounded-sm" />
                    <Skeleton className="h-4 w-28" />
                </div>
            </div>

            <Skeleton className="aspect-video w-full rounded-sm" />

            <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </div>
        </div>
    )
}
