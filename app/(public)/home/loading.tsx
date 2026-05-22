import { Skeleton } from "@/app/components/ui/skeleton";

export default function HomeLoading() {
    return (
        <div className="page-wide py-6">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
                {/* Left sidebar */}
                <aside className="hidden lg:block space-y-6">
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24 rounded-sm" />
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-32 rounded-sm" />
                        ))}
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-20 rounded-sm" />
                        {[1, 2].map((i) => (
                            <Skeleton key={i} className="h-32 rounded-sm" />
                        ))}
                    </div>
                </aside>

                {/* Center */}
                <section className="space-y-6">
                    <Skeleton className="h-[260px] rounded-sm" />
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-40 rounded-sm" />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-10 w-full rounded-sm" />
                        ))}
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
