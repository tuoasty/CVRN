import { Skeleton } from "@/app/components/ui/skeleton";
import { PlayoffBracketLoading } from "@/app/features/playoffs/PlayoffBracketLoading";

export default function PlayoffsLoading() {
    return (
        <div className="page-wide py-6 space-y-6">
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-sm shrink-0" />
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-28 rounded-sm" />
                    <Skeleton className="h-3 w-44 rounded-sm" />
                </div>
            </div>
            <PlayoffBracketLoading />
        </div>
    );
}
