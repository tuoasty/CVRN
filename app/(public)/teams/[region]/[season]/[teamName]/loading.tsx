import { Skeleton } from "@/app/components/ui/skeleton";

function Heading({ width = "w-24" }: { width?: string }) {
    return (
        <div className="flex min-h-9 items-end border-b border-border pb-2">
            <Skeleton className={`h-5 ${width}`} />
        </div>
    );
}

export default function TeamDetailLoading() {
    return (
        <div className="page-wide py-6">
            <Skeleton className="h-4 w-16" />
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
                <Skeleton className="h-24 w-24 shrink-0 sm:h-32 sm:w-32" />
                <div className="min-w-0 space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-3.5 w-72 max-w-full" />
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-3 sm:flex sm:gap-x-10">
                        {Array.from({ length: 4 }, (_, i) => (
                            <div key={i} className="space-y-1.5">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-6 w-14" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-12 grid gap-12 min-[1100px]:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                <div>
                    <Heading />
                    <div className="mt-3 grid grid-cols-1 sm:mt-4 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:gap-x-4 sm:gap-y-6">
                        {Array.from({ length: 8 }, (_, i) => (
                            <div key={i}>
                                <div className="flex items-center gap-3 py-1.5 sm:hidden">
                                    <Skeleton className="h-10 w-10 shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <Skeleton className="h-3.5 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <div className="hidden sm:block">
                                    <Skeleton className="aspect-[4/5] w-full" />
                                    <Skeleton className="mt-2 h-3.5 w-3/4" />
                                    <Skeleton className="mt-1.5 h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-12">
                    <div>
                        <Heading />
                        <div className="mt-2 space-y-3">
                            {Array.from({ length: 4 }, (_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-8 w-8" />
                                    <Skeleton className="h-3.5 flex-1" />
                                    <Skeleton className="h-3.5 w-8" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="mt-3 h-11 w-full" />
                        <div className="mt-3 space-y-2">
                            {Array.from({ length: 8 }, (_, i) => (
                                <Skeleton key={i} className="h-4 w-full" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12">
                <Heading />
                <div className="mt-2 space-y-2">
                    {Array.from({ length: 6 }, (_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
            </div>

            <div className="mt-12">
                <Heading width="w-16" />
                <div className="mt-3 space-y-2">
                    {Array.from({ length: 8 }, (_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}
