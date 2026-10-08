import {Skeleton} from "@/app/components/ui/skeleton";

function CategorySkeleton() {
    return (
        <div>
            <div className="border-b border-border pb-2">
                <Skeleton className="h-5 w-24" />
            </div>
            <div className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-3 pt-3.5">
                <Skeleton className="size-10 justify-self-end rounded-full" />
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-8 w-8" />
            </div>
            {Array.from({length: 4}).map((_, i) => (
                <div
                    key={i}
                    className="grid grid-cols-[28px_24px_minmax(0,1fr)_40px] items-center border-b border-border/60 py-[7px] last:border-b-0"
                >
                    <Skeleton className="mr-2 h-3 w-3 justify-self-end" />
                    <Skeleton className="size-6 rounded-full" />
                    <div className="space-y-1 pl-3">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-4 w-5 justify-self-end" />
                </div>
            ))}
        </div>
    );
}

export default function RecordsLoading() {
    return (
        <div className="page-wide pb-20 pt-7">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="mt-1.5 h-4 w-full max-w-[480px]" />

            <div className="mt-5 grid grid-cols-[72px_minmax(0,1fr)] items-center gap-y-1">
                {Array.from({length: 2}).map((_, row) => (
                    <div key={row} className="contents">
                        <Skeleton className="h-3 w-12" />
                        <div className="flex h-8 items-center gap-3 px-2.5">
                            {Array.from({length: 5}).map((__, i) => (
                                <Skeleton key={i} className="h-4 w-7" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex h-11 items-end gap-1 border-b border-border">
                {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="flex h-full items-center px-3.5">
                        <Skeleton className="h-4 w-20" />
                    </div>
                ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-11 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({length: 6}).map((_, i) => (
                    <CategorySkeleton key={i} />
                ))}
            </div>
        </div>
    );
}
