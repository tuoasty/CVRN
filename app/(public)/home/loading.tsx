import { Skeleton } from "@/app/components/ui/skeleton";

export default function HomeLoading() {
    return (
        <div className="page-wide py-6">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
                {/* Left sidebar — only recent section; upcoming section omitted
                    because it is hidden for completed seasons, causing a large collapse */}
                <aside className="hidden lg:block space-y-3">
                    <Skeleton className="h-4 w-20 rounded-sm" />
                    {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-sm" />
                    ))}
                </aside>

                {/* Center */}
                <section className="space-y-6">
                    {/* Featured card — min-h to allow growth */}
                    <Skeleton className="min-h-[260px] rounded-sm" />
                    {/* Standings preview — matches StandingsPreview isLoading state:
                        5 rows h-12 space-y-2, plus the "View Full Standings" button */}
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-40 rounded-sm" />
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-12 w-full rounded-sm" />
                            ))}
                        </div>
                        <Skeleton className="h-9 w-full rounded-sm" />
                    </div>
                </section>

                {/* Right sidebar */}
                <aside className="hidden lg:block space-y-3">
                    <Skeleton className="h-4 w-20 rounded-sm" />
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-sm" />
                    ))}
                </aside>
            </div>
        </div>
    );
}
