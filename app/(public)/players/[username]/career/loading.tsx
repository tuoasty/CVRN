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
        <div className="max-w-[1440px] mx-auto px-4 pb-6 pt-2 space-y-11">
            <div className="-mx-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border px-4 py-2">
                <Skeleton className="h-4 w-72" />
                <div className="flex items-center gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-sm" />
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
            </div>
            <TableSkeleton rows={3} titleWidth="w-28" />
            <TableSkeleton rows={5} titleWidth="w-16" />
            <TableSkeleton rows={4} titleWidth="w-24" />
        </div>
    );
}
