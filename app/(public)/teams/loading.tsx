import { Skeleton } from "@/app/components/ui/skeleton";

export default function TeamsLoading() {
    return (
        <div className="page-wide py-6">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="h-3.5 w-56" />
                </div>
                <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-3 sm:w-auto">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-9 w-full sm:w-[260px]" />
                </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-x-8">
                {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="flex flex-col items-center px-2 py-4">
                        <Skeleton className="h-20 w-20 sm:h-28 sm:w-28" />
                        <Skeleton className="mt-4 h-5 w-32" />
                        <Skeleton className="mt-1.5 h-4 w-10" />
                        <Skeleton className="mt-3 h-6 w-28" />
                        <Skeleton className="mt-1.5 h-3 w-36" />
                    </div>
                ))}
            </div>
        </div>
    );
}
