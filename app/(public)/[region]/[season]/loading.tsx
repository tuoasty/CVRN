import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { HERO_ROW_HEIGHT } from "@/app/(public)/home/hero/GfxFrame";

const TWO_COL = "page-wide mt-14 grid gap-12 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]";
const MEDIA_RATIOS = [16 / 9, 16 / 9, 0.8, 16 / 9, 16 / 9, 16 / 9, 0.8, 16 / 9, 16 / 9, 16 / 9, 16 / 9, 0.8];

function Heading({ wide = false }: { wide?: boolean }) {
    return (
        <div className="flex min-h-9 items-end border-b border-border pb-2">
            <Skeleton className={cn("h-5 rounded-sm", wide ? "w-36" : "w-24")} />
        </div>
    );
}

function Rows({ count, height = "h-10" }: { count: number; height?: string }) {
    return (
        <div className="mt-2 space-y-1">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className={cn("w-full rounded-sm", height)} />
            ))}
        </div>
    );
}

export default function HomeLoading() {
    return (
        <div className="pb-20">
            <div className="page-wide mt-5">
                <div className={cn("flex flex-col gap-6 lg:flex-row lg:gap-10", HERO_ROW_HEIGHT)}>
                    <Skeleton className="aspect-video w-full rounded-none lg:h-full lg:w-auto lg:max-w-[60%]" />
                    <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex justify-between">
                            <Skeleton className="h-3 w-32 rounded-sm" />
                            <Skeleton className="h-3 w-20 rounded-sm" />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <Skeleton className="h-10 w-40 rounded-sm" />
                            <Skeleton className="h-8 w-14 rounded-sm" />
                            <Skeleton className="h-10 w-40 rounded-sm" />
                        </div>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-7 w-full rounded-sm" />
                        ))}
                    </div>
                </div>
                <div className="mt-4 [container-type:inline-size]">
                    <div className="flex gap-2 overflow-hidden pb-1 lg:[--th:calc((100cqw_-_48px)*9/112)]">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="shrink-0">
                                <Skeleton className="h-24 w-[171px] rounded-none lg:h-[var(--th)] lg:w-[calc(var(--th)*16/9)]" />
                                <div className="mt-1.5 h-0.5" />
                                <div className="mt-1 h-4" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className={TWO_COL}>
                <div>
                    <Heading />
                    <Rows count={10} />
                </div>
                <div>
                    <Heading />
                    <Rows count={6} height="h-9" />
                </div>
            </div>
            <div className={TWO_COL}>
                <div>
                    <Heading />
                    <Skeleton className="mt-3 aspect-video w-full rounded-sm" />
                </div>
                <div>
                    <Heading />
                    <Rows count={10} height="h-8" />
                </div>
            </div>
            <div className="page-wide mt-14">
                <Heading wide />
                <div className="mt-4 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-2.5">
                            <Skeleton className="h-3 w-16 rounded-sm" />
                            {Array.from({ length: 3 }).map((_, j) => (
                                <Skeleton key={j} className="h-9 w-full rounded-sm" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="page-wide mt-14">
                <Heading />
                <div className="mt-3 flex flex-wrap gap-2">
                    {MEDIA_RATIOS.map((r, i) => (
                        <Skeleton
                            key={i}
                            className="h-[190px] rounded-none"
                            style={{ flexGrow: r, flexBasis: r * 190 }}
                        />
                    ))}
                </div>
            </div>
            <div className="page-wide mt-14">
                <Heading />
                <div className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="aspect-video w-full rounded-none" />
                            <Skeleton className="h-4 w-3/4 rounded-sm" />
                            <Skeleton className="h-3 w-full rounded-sm" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
