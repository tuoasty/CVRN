import { Skeleton } from "@/app/components/ui/skeleton";
import AdminScheduleRowsSkeleton from "@/app/features/matches/AdminScheduleRowsSkeleton";

export default function AdminMatchesLoading() {
    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-sm" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-6 w-52 rounded-sm" />
                        <Skeleton className="h-3.5 w-72 rounded-sm" />
                    </div>
                </div>

                <div className="space-y-4">
                    <Skeleton className="h-[38px] w-full rounded-sm" />
                    <Skeleton className="h-11 sm:h-[38px] w-full rounded-sm" />
                </div>

                <div className="w-full">
                    <Skeleton className="h-10 w-72 rounded-sm" />
                    <div className="mt-6">
                        <AdminScheduleRowsSkeleton />
                    </div>
                </div>
            </div>
        </div>
    );
}
