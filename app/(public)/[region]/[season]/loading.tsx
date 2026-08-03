import { Skeleton } from "@/app/components/ui/skeleton";

/**
 * Lives here rather than under `home/` because `app/(public)/home/` holds components, not a
 * route — a loading.tsx there creates no boundary and the page fell back to the bare spinner
 * in `(public)/loading.tsx`.
 *
 * Heights are measured against the real components, not guessed: 376px is the fixed height
 * every center-card branch shares, 100px is `CompactMatchCard` in compact mode, and 46px is a
 * `StandingsPreview` row (p-2.5 around a 24px logo).
 */
export default function HomeLoading() {
    return (
        <div className="page-wide py-6">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
                <aside className="hidden lg:block space-y-6">
                    <SidebarSection />
                    <SidebarSection />
                </aside>

                <section className="space-y-6">
                    {/* Matches the featured carousel, which is the branch that renders whenever any
                        upcoming or recent match has a graphic attached. */}
                    <Skeleton className="aspect-video min-h-[280px] w-full rounded-sm" />

                    <div className="space-y-3">
                        <div className="border-t border-border pt-4">
                            <Skeleton className="h-5 w-44 rounded-sm mb-4" />
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <Skeleton key={i} className="h-[46px] w-full rounded-sm" />
                                    ))}
                                </div>
                                <Skeleton className="h-9 w-full rounded-sm" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* No `hidden lg:block` — the real right aside has none, so hiding it here would
                    blank the column below lg while the page shows a full media panel. */}
                <aside>
                    <div className="panel p-3 space-y-3">
                        <div className="border border-border rounded-sm overflow-hidden">
                            <Skeleton className="w-full rounded-none" style={{ aspectRatio: "16/9" }} />
                            <div className="px-2 py-1.5 space-y-1">
                                <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                                <Skeleton className="h-2.5 w-1/2 rounded-sm" />
                            </div>
                        </div>

                        {[0, 1].map(i => (
                            <Skeleton
                                key={i}
                                className="w-full rounded-sm"
                                style={{ aspectRatio: "3/1" }}
                            />
                        ))}

                        <Skeleton className="w-full rounded-sm" style={{ aspectRatio: "9/16" }} />

                        <div className="flex justify-center pt-1">
                            <Skeleton className="h-4 w-20 rounded-sm" />
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function SidebarSection() {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-3.5 w-20 rounded-sm" />
            </div>
            <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[100px] w-full rounded-sm" />
                ))}
            </div>
        </div>
    );
}
