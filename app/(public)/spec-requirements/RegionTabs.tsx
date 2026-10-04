import Link from "next/link";
import {cn} from "@/lib/utils";
import type {PublishedSpecRegion} from "@/server/domains/spec/types";

export default function RegionTabs({
    regions,
    active,
    pos,
}: {
    regions: PublishedSpecRegion[];
    active: string;
    pos: string;
}) {
    if (regions.length <= 1) return null;

    return (
        <div className="mb-4 flex w-max border border-border">
            {regions.map(r => (
                <Link
                    key={r.regionId}
                    href={`?region=${r.code.toLowerCase()}&pos=${pos.toLowerCase()}`}
                    scroll={false}
                    title={r.name}
                    className={cn(
                        "flex h-[38px] items-center border-r border-border px-[18px] font-mono text-sm font-medium uppercase tracking-wide last:border-r-0",
                        active === r.regionId
                            ? "bg-secondary font-semibold text-secondary-foreground"
                            : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                >
                    {r.code}
                </Link>
            ))}
        </div>
    );
}
