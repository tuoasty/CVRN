import {Skeleton} from "@/app/components/ui/skeleton";

const COLUMNS = [4, 2, 1];

function SlotSkeleton() {
    return (
        <div>
            <div className="mb-1.5 flex h-4 items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
            </div>
            <div className="border border-border">
                <div className="flex h-[46px] items-center gap-2.5 px-3">
                    <Skeleton className="h-7 w-7" />
                    <Skeleton className="h-3.5 w-32" />
                </div>
                <div className="flex h-[46px] items-center gap-2.5 border-t border-border/60 px-3">
                    <Skeleton className="h-7 w-7" />
                    <Skeleton className="h-3.5 w-28" />
                </div>
            </div>
        </div>
    );
}

export function PlayoffBracketLoading() {
    return (
        <div className="overflow-hidden" role="status" aria-label="Loading bracket">
            <div className="flex gap-[72px] pt-10">
                {COLUMNS.map((count, i) => (
                    <div key={i} className="w-[300px] shrink-0">
                        <Skeleton className="mb-6 h-4 w-28" />
                        <div className="flex flex-col justify-around gap-5" style={{minHeight: 4 * 136}}>
                            {Array.from({length: count}, (_, j) => (
                                <SlotSkeleton key={j} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
