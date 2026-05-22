import { Skeleton } from "@/app/components/ui/skeleton";
import { BookOpen } from "lucide-react";

export default function ArchiveLoading() {
    return (
        <div className="page-wide space-y-6 py-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                    <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-24 rounded-sm" />
                    <Skeleton className="h-3 w-44 rounded-sm" />
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="panel p-5 space-y-4">
                        <div className="space-y-1.5">
                            <Skeleton className="h-5 w-32 rounded-sm" />
                            <Skeleton className="h-3 w-40 rounded-sm" />
                        </div>
                        <div className="border-l-2 border-primary/20 pl-4 space-y-2.5">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
                                <Skeleton className="h-9 w-9 rounded-sm shrink-0" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-28 rounded-sm" />
                                    <Skeleton className="h-2.5 w-16 rounded-sm" />
                                </div>
                            </div>
                            {[1, 2].map((j) => (
                                <div key={j} className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
                                    <Skeleton className="h-6 w-6 rounded-sm shrink-0" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-3.5 w-24 rounded-sm" />
                                        <Skeleton className="h-2.5 w-14 rounded-sm" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
