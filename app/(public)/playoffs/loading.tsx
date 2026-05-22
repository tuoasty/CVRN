import { Skeleton } from "@/app/components/ui/skeleton";

export default function PlayoffsLoading() {
    return (
        <div className="page-wide py-6 space-y-6">
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-sm shrink-0" />
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-28 rounded-sm" />
                    <Skeleton className="h-3 w-44 rounded-sm" />
                </div>
            </div>
            <div className="flex gap-6 justify-center overflow-x-auto py-4">
                {[1, 2, 3].map((col) => (
                    <div key={col} className="flex flex-col gap-8 shrink-0">
                        {[...Array(4 / col)].map((_, i) => (
                            <Skeleton key={i} className="h-24 w-48 rounded-sm" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
