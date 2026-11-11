import {Skeleton} from "@/app/components/ui/skeleton";

function RuledSkeleton({rows, titleWidth, rowClassName}: {rows: number; titleWidth: string; rowClassName?: string}) {
    return (
        <div>
            <Skeleton className={`h-4 ${titleWidth}`} />
            <div className="mt-2 border-t border-border">
                {Array.from({length: rows}).map((_, i) => (
                    <div key={i} className={`flex items-center gap-3 py-2 ${rowClassName ?? ""}`}>
                        <Skeleton className="size-7 shrink-0 rounded-sm" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function PlayerPageLoading() {
    return (
        <>
        <div className="page-wide">
            <div className="pt-3">
                <Skeleton className="h-9 w-20" />
            </div>
            <div className="flex items-end gap-1 pt-2">
                <Skeleton className="hidden h-20 w-20 shrink-0 self-start rounded-sm sm:block" />
                <Skeleton className="h-[148px] w-[120px] shrink-0 rounded-sm sm:h-[200px] sm:w-[200px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-2 self-center pl-3 sm:pl-8">
                    <Skeleton className="h-7 w-36 sm:w-48" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>
        </div>

        <div className="page-wide space-y-11 pb-6 pt-11">

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-9 w-40" />
                </div>
                <Skeleton className="h-32 w-full rounded-sm" />
            </div>

            <div className="flex flex-col gap-11 lg:flex-row lg:items-start lg:gap-12">
                <div className="min-w-0 shrink-0">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-[21px] h-[364px] w-full rounded-sm sm:w-[260px]" />
                </div>
                <div className="grid min-w-0 flex-1 gap-x-12 gap-y-11 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <RuledSkeleton rows={6} titleWidth="w-36" rowClassName="h-[72px] lg:h-[62.67px]" />
                    <RuledSkeleton rows={4} titleWidth="w-20" />
                </div>
            </div>

            <div className="grid gap-x-12 gap-y-11 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <RuledSkeleton rows={3} titleWidth="w-28" />
                <RuledSkeleton rows={3} titleWidth="w-28" />
            </div>
        </div>
        </>
    );
}
