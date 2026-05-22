import { Skeleton } from "@/app/components/ui/skeleton";
import { Image as ImageIcon } from "lucide-react";

export default function MediaLoading() {
    return (
        <main className="page-narrow py-8 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                    <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-20 rounded-sm" />
                    <Skeleton className="h-3 w-52 rounded-sm" />
                </div>
            </div>
            <div className="flex gap-1.5">
                <Skeleton className="h-6 w-10 rounded-sm" />
                <Skeleton className="h-6 w-24 rounded-sm" />
            </div>
            <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="panel flex overflow-hidden gap-0">
                        <Skeleton className="w-48 sm:w-64 flex-shrink-0 aspect-video rounded-none" />
                        <div className="flex-1 p-4 space-y-2">
                            <Skeleton className="h-4 w-16 rounded-sm" />
                            <Skeleton className="h-5 w-3/4 rounded-sm" />
                            <Skeleton className="h-3 w-1/2 rounded-sm" />
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
