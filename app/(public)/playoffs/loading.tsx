import { Skeleton } from "@/app/components/ui/skeleton";
import { PlayoffBracketLoading } from "@/app/features/playoffs/PlayoffBracketLoading";

export default function PlayoffsLoading() {
    return (
        <>
            <div className="page-wide py-6">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-3.5 w-56" />
                </div>
            </div>
            <div className="page-bleed pb-6">
                <PlayoffBracketLoading />
            </div>
        </>
    );
}
