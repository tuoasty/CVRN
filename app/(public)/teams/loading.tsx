import { Skeleton } from "@/app/components/ui/skeleton";
import { Users } from "lucide-react";

export default function TeamsLoading() {
    return (
        <div className="page-wide space-y-6 py-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                    <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-24 rounded-sm" />
                    <Skeleton className="h-3 w-56 rounded-sm" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="rounded-sm border border-border bg-card overflow-hidden">
                        <Skeleton className="h-36 w-full rounded-none" />
                        <div className="border-t border-border">
                            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
                                <Skeleton className="h-4 flex-1 rounded-sm" />
                                <Skeleton className="h-4 w-8 rounded-sm shrink-0" />
                            </div>
                            <div className="flex items-center gap-1.5 px-3 pb-2.5">
                                <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                                <Skeleton className="h-3 w-20 rounded-sm" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
