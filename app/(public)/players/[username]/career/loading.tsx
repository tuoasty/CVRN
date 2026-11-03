import {Skeleton} from "@/app/components/ui/skeleton";

function TableSkeleton({rows, titleWidth}: {rows: number; titleWidth: string}) {
    return (
        <div>
            <Skeleton className={`h-4 ${titleWidth}`} />
            <div className="mt-2 border-t border-border">
                {Array.from({length: rows}).map((_, i) => (
                    <div key={i} className="flex items-center gap-6 border-b border-border/60 py-3 last:border-b-0">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="size-7 shrink-0 rounded-sm" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function CareerLoading() {
    return (
        <div className="max-w-[1440px] mx-auto px-4 py-6 space-y-11">
            <div className="space-y-4">
                <Skeleton className="h-5 w-32" />
                <div className="flex items-center gap-4">
                    <Skeleton className="size-16 shrink-0 rounded-sm" />
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-28" />
                    </div>
                </div>
                <Skeleton className="h-4 w-64" />
            </div>
            <TableSkeleton rows={3} titleWidth="w-28" />
            <TableSkeleton rows={5} titleWidth="w-16" />
            <TableSkeleton rows={4} titleWidth="w-24" />
        </div>
    );
}
