import { Skeleton } from "@/app/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";

export default function MatchDetailLoading() {
    return (
        <div className="page-wide py-6 space-y-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronLeft className="h-3.5 w-3.5" />
                <Skeleton className="h-3.5 w-20 rounded-sm" />
            </div>

            <div className="space-y-4 pb-6 border-b border-border">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-border">
                    <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-3 w-24 rounded-sm" />
                        <div className="flex items-center gap-1.5">
                            <Skeleton className="h-5 w-20 rounded-sm" />
                            <Skeleton className="h-5 w-12 rounded-sm" />
                            <Skeleton className="h-5 w-16 rounded-sm" />
                        </div>
                    </div>
                    <Skeleton className="h-3 w-24 rounded-sm shrink-0" />
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 py-2 sm:py-3">
                    <div className="flex flex-col items-center gap-2">
                        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm" />
                        <Skeleton className="h-5 w-28 rounded-sm" />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 px-1 sm:px-2">
                        <Skeleton className="h-10 w-8 sm:h-14 sm:w-10 rounded-sm" />
                        <span className="text-2xl sm:text-3xl text-muted-foreground/20">−</span>
                        <Skeleton className="h-10 w-8 sm:h-14 sm:w-10 rounded-sm" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm" />
                        <Skeleton className="h-5 w-28 rounded-sm" />
                    </div>
                </div>

                <div className="flex items-center justify-center gap-1.5">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-7 w-14 rounded-sm" />
                    ))}
                </div>

                {}
                <div className="flex items-center justify-center pt-1">
                    <Skeleton className="h-5 w-24 rounded-sm" />
                </div>

                <div className="flex flex-wrap items-start gap-x-6 gap-y-2 pt-3 border-t border-border">
                    {[0, 1].map(g => (
                        <div key={g} className="flex items-center gap-2">
                            <Skeleton className="h-2.5 w-10 rounded-sm" />
                            <div className="flex items-center gap-1.5">
                                <Skeleton className="h-5 w-5 rounded-full" />
                                <Skeleton className="h-3 w-20 rounded-sm" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="flex gap-0.5">
                        <Skeleton className="h-9 w-16 rounded-sm" />
                        <Skeleton className="h-9 w-14 rounded-sm" />
                        <Skeleton className="h-9 w-14 rounded-sm" />
                    </div>
                    <Skeleton className="h-9 w-28 rounded-sm" />
                </div>

                {}
                <Skeleton className="h-[50px] w-full rounded-sm" />

                <div className="border border-border rounded-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {}
                        <div className="min-w-[900px]">
                            <div className="flex items-center gap-3 px-2 h-6 bg-muted/30 border-b border-border/50">
                                <div className="w-40 shrink-0" />
                                <div className="flex gap-6 ml-auto">
                                    {[...Array(6)].map((_, i) => (
                                        <Skeleton key={i} className="h-2.5 w-12 rounded-sm" />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-2 h-8 bg-muted/30 border-b-2 border-border">
                                <Skeleton className="h-3 w-32 rounded-sm shrink-0" />
                                <div className="flex gap-4 ml-auto">
                                    {[...Array(12)].map((_, i) => (
                                        <Skeleton key={i} className="h-3 w-6 rounded-sm" />
                                    ))}
                                </div>
                            </div>

                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-2 py-3 border-b border-border">
                                    <div className="flex items-center gap-2 shrink-0 min-w-[160px]">
                                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                        <Skeleton className="h-3.5 w-24 rounded-sm" />
                                    </div>
                                    <div className="flex gap-4 ml-auto">
                                        {[...Array(12)].map((_, j) => (
                                            <Skeleton key={j} className="h-3.5 w-6 rounded-sm" />
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {}
                            <div className="flex items-center gap-3 px-2 h-8 bg-muted border-t-2 border-border">
                                <Skeleton className="h-3 w-24 rounded-sm shrink-0" />
                            </div>
                            {[0, 1].map(t => (
                                <div key={t} className="flex items-center gap-3 px-2 py-3 border-b border-border last:border-0">
                                    <div className="flex items-center gap-2 shrink-0 min-w-[160px]">
                                        <Skeleton className="h-6 w-6 rounded-sm shrink-0" />
                                        <Skeleton className="h-3.5 w-28 rounded-sm" />
                                    </div>
                                    <div className="flex gap-4 ml-auto">
                                        {[...Array(12)].map((_, j) => (
                                            <Skeleton key={j} className="h-3.5 w-6 rounded-sm" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
