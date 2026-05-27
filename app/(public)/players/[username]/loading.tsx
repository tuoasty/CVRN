import {Skeleton} from "@/app/components/ui/skeleton";

export default function PlayerPageLoading() {
    return (
        <div className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">
            {/* Back */}
            <Skeleton className="h-5 w-16" />

            {/* Header */}
            <div className="flex gap-5 items-start">
                <Skeleton className="w-[130px] h-[174px] rounded-md shrink-0" />
                <div className="flex flex-col gap-2 pt-1 flex-1">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-40 mt-2" />
                </div>
            </div>

            {/* Stats table */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-9 w-40" />
                </div>
                <Skeleton className="h-40 w-full rounded-sm" />
            </div>

            {/* Awards */}
            <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-24 w-full rounded-sm" />
            </div>

            {/* Team history */}
            <div className="space-y-3">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-32 w-full rounded-sm" />
            </div>
        </div>
    );
}
