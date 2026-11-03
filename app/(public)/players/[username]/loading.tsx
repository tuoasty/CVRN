import {Skeleton} from "@/app/components/ui/skeleton";

function RuledSkeleton({rows, titleWidth}: {rows: number; titleWidth: string}) {
    return (
        <div>
            <Skeleton className={`h-4 ${titleWidth}`} />
            <div className="mt-2 border-t border-border">
                {Array.from({length: rows}).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 border-b border-border/60 py-2 last:border-b-0">
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
        <div className="max-w-[1440px] mx-auto px-4 py-6 space-y-11">
            <Skeleton className="h-5 w-16" />

            <div className="flex gap-1 items-end">
                <Skeleton className="w-14 h-14 sm:w-20 sm:h-20 shrink-0 self-start rounded-sm" />
                <Skeleton className="w-[140px] h-[140px] sm:w-[200px] sm:h-[200px] shrink-0 rounded-sm" />
                <div className="flex flex-col gap-2 pl-3 sm:pl-8 pb-2 flex-1 min-w-0">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-36 sm:h-8 sm:w-48" />
                    <Skeleton className="h-4 w-24 mt-1" />
                </div>
            </div>

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
                    <Skeleton className="mt-5 h-[420px] w-full rounded-sm sm:w-[300px]" />
                </div>
                <div className="grid min-w-0 flex-1 gap-x-12 gap-y-11 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <RuledSkeleton rows={5} titleWidth="w-36" />
                    <RuledSkeleton rows={4} titleWidth="w-20" />
                </div>
            </div>

            <div className="grid gap-x-12 gap-y-11 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <RuledSkeleton rows={3} titleWidth="w-28" />
                <RuledSkeleton rows={3} titleWidth="w-28" />
            </div>
        </div>
    );
}
