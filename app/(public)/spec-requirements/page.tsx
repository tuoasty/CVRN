import type {Metadata} from "next";
import {getCachedPublicSpecSnapshot, getCachedPublishedSpecRegions} from "@/server/cache/publicReads";
import {isPositionCode, positionLabel} from "@/shared/volleyball/positions";
import PositionTabs from "./PositionTabs";
import RegionTabs from "./RegionTabs";
import PlacementBonuses from "./PlacementBonuses";
import SpecRequirementCard from "./SpecRequirementCard";

export const metadata: Metadata = {
    title: "Spec Requirements",
    description: "What it takes to qualify for each spec, by position.",
};

export default async function SpecRequirementsPage({
    searchParams,
}: {
    searchParams: Promise<{pos?: string; region?: string}>;
}) {
    const sp = await searchParams;
    const raw = (sp.pos ?? "oh").toUpperCase();
    const pos = isPositionCode(raw) ? raw : "OUT";

    const regions = await getCachedPublishedSpecRegions();
    const wanted = (sp.region ?? "").toUpperCase();
    const region =
        regions.find(r => r.code.toUpperCase() === wanted) ??
        regions.find(r => r.code.toUpperCase() === "NA") ??
        regions[0] ??
        null;

    const snapshot = region ? await getCachedPublicSpecSnapshot(region.regionId) : null;

    return (
        <div className="mx-auto max-w-[1400px] px-7 pb-20 pt-6">
            <header>
                <h1 className="mb-5 text-2xl font-semibold tracking-[-.025em]">Spec Requirements</h1>
            </header>

            {!snapshot || snapshot.specs.length === 0 ? (
                <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
                    Nothing to see here
                </div>
            ) : (
                <>
                    <RegionTabs regions={regions} active={region?.regionId ?? ""} pos={pos} />
                    <PlacementBonuses config={snapshot.placementBonus} />
                    <PositionTabs active={pos} region={regions.length > 1 ? (region?.code ?? null) : null} />
                    <SpecGrid snapshot={snapshot} pos={pos} />
                </>
            )}

            <footer className="mt-16 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                Spec requirements by toast &amp; Rixuz
            </footer>
        </div>
    );
}

function SpecGrid({
    snapshot,
    pos,
}: {
    snapshot: NonNullable<Awaited<ReturnType<typeof getCachedPublicSpecSnapshot>>>;
    pos: string;
}) {
    const specs = snapshot.specs.filter(s => s.position === pos);
    const floorFor = (stars: number) => snapshot.setsFloorByStar[stars] ?? 10;

    return (
        <div className="pt-5">
            <div className="mb-3.5 mt-1.5 flex items-baseline gap-2.5">
                <span className="text-xl font-semibold tracking-[-.02em]">{positionLabel(pos)}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {specs.length} spec{specs.length === 1 ? "" : "s"}
                </span>
            </div>

            {specs.length === 0 ? (
                <div className="flex min-h-[340px] items-center justify-center text-sm text-muted-foreground">
                    Nothing to see here
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[900px]:grid-cols-3 min-[1180px]:grid-cols-4">
                    {specs.map(spec => (
                        <SpecRequirementCard key={spec.id} spec={spec} floor={floorFor(spec.stars)} />
                    ))}
                </div>
            )}
        </div>
    );
}
