import { Skeleton } from "@/app/components/ui/skeleton";
import { ChevronLeft, Trophy, Users, Award } from "lucide-react";

export default function ArchiveDetailLoading() {
    return (
        <div className="page-narrow space-y-6 py-6">
            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronLeft className="h-3.5 w-3.5" />
                <Skeleton className="h-3.5 w-24 rounded-sm" />
            </div>
            <div className="space-y-1.5">
                <Skeleton className="h-8 w-56 rounded-sm" />
                <Skeleton className="h-3.5 w-36 rounded-sm" />
            </div>
            <div className="space-y-2">
                <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-muted-foreground/40" />
                    <Skeleton className="h-2.5 w-12 rounded-sm" />
                </div>
                <Skeleton className="h-64 w-full rounded-sm" />
                <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-44 rounded-sm" />
                    <Skeleton className="h-44 rounded-sm" />
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground/40" />
                    <Skeleton className="h-2.5 w-28 rounded-sm" />
                </div>
                <Skeleton className="h-52 w-full rounded-sm" />
            </div>
            <div className="space-y-3">
                <div className="flex items-center gap-1">
                    <Award className="h-3 w-3 text-muted-foreground/40" />
                    <Skeleton className="h-2.5 w-28 rounded-sm" />
                </div>
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-44 sm:h-64 w-full rounded-sm" />
                    <Skeleton className="h-44 sm:h-64 w-full rounded-sm" />
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex items-center gap-1">
                    <Award className="h-3 w-3 text-muted-foreground/40" />
                    <Skeleton className="h-2.5 w-20 rounded-sm" />
                </div>
                <Skeleton className="h-48 w-full rounded-sm" />
            </div>
        </div>
    );
}
