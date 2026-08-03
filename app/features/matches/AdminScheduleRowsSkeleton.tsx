import { Skeleton } from "@/app/components/ui/skeleton";

export default function AdminScheduleRowsSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div className="space-y-1.5">
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="panel px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2
                               lg:grid lg:grid-cols-[180px_minmax(0,1fr)_176px]
                               xl:grid-cols-[180px_minmax(0,1fr)_240px_176px]"
                >
                    <div className="w-[180px] shrink-0 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                            <Skeleton className="h-4 w-6 rounded-sm" />
                            <Skeleton className="h-4 w-16 rounded-sm" />
                            <Skeleton className="h-4 w-10 rounded-sm" />
                        </div>
                        <Skeleton className="h-[15px] w-28 rounded-sm" />
                    </div>

                    <div className="basis-full lg:basis-auto order-last lg:order-none min-w-0 grid grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] items-center gap-2">
                        <div className="flex items-center justify-end gap-2 min-w-0">
                            <Skeleton className="h-3.5 w-24 rounded-sm" />
                            <Skeleton className="h-10 w-10 rounded-sm shrink-0" />
                        </div>
                        <Skeleton className="h-5 w-10 rounded-sm mx-auto" />
                        <div className="flex items-center gap-2 min-w-0">
                            <Skeleton className="h-10 w-10 rounded-sm shrink-0" />
                            <Skeleton className="h-3.5 w-24 rounded-sm" />
                        </div>
                    </div>

                    <div className="hidden xl:flex items-center justify-start gap-1 w-[240px]">
                        {[0, 1, 2].map(s => (
                            <Skeleton key={s} className="h-5 w-11 rounded-sm" />
                        ))}
                    </div>

                    <div className="flex items-center justify-end gap-0.5 shrink-0 ml-auto lg:ml-0 lg:w-[176px]">
                        {[0, 1, 2, 3, 4].map(c => (
                            <Skeleton key={c} className="h-10 w-10 sm:h-8 sm:w-8 rounded-sm" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
