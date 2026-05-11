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
            <div className="rounded-sm border border-border divide-y divide-border overflow-hidden">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <Skeleton className="w-1 h-8 rounded-full shrink-0" />
                        <Skeleton className="w-9 h-9 rounded-sm shrink-0" />
                        <Skeleton className="h-4 flex-1 rounded-sm" />
                        <Skeleton className="h-4 w-10 rounded-sm shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
}
