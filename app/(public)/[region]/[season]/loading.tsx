import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { HERO_ROW_HEIGHT } from "@/app/(public)/home/hero/GfxFrame";

const TWO_COL = "page-wide mt-14 grid gap-12 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]";

function Lines({ count, height = "h-9" }: { count: number; height?: string }) {
    return (
        <div className="mt-3 space-y-1.5">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className={cn("w-full rounded-sm", height)} />
            ))}
        </div>
    );
}

function Heading() {
    return (
        <div className="border-b border-border pb-2">
            <Skeleton className="h-5 w-28 rounded-sm" />
        </div>
    );
}

export default function HomeLoading() {
    return (
        <div className="pb-20">
            <div className="page-wide mt-5">
                <Skeleton className={cn("aspect-video w-full rounded-none lg:aspect-auto", HERO_ROW_HEIGHT)} />
                <div className="mt-4 flex gap-2 overflow-hidden">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-[170px] shrink-0 rounded-none" />
                    ))}
                </div>
            </div>
            <div className={TWO_COL}>
                <div>
                    <Heading />
                    <Lines count={10} />
                </div>
                <div>
                    <Heading />
                    <Lines count={6} />
                </div>
            </div>
            <div className={TWO_COL}>
                <div>
                    <Heading />
                    <Skeleton className="mt-3 aspect-video w-full rounded-sm" />
                </div>
                <div>
                    <Heading />
                    <Lines count={8} height="h-8" />
                </div>
            </div>
        </div>
    );
}
