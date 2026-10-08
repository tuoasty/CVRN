import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getCachedRecords} from "@/server/cache/publicReads";
import {RecordsParamsSchema} from "@/server/domains/record";
import type {RecordEntry, RecordGrain} from "@/server/domains/record";

export const metadata: Metadata = {
    title: "Records",
    description: "The best single-set, single-match and season performances in CVRN playoff history.",
};

const GRAIN_LABELS: Record<RecordGrain, string> = {
    set: "Single Set",
    match: "Single Match",
    season: "Season",
};

function contextLine(entry: RecordEntry): string {
    const scope = `${entry.regionCode} S${entry.season.number ?? "?"}`;
    if (entry.grain === "season") return `${scope} · ${entry.matchesPlayed} M · ${entry.setsPlayed} S`;
    const parts = [
        entry.opponent ? `vs ${entry.opponent.name}` : null,
        entry.match?.code ?? null,
        entry.grain === "set" ? `Set ${entry.setNumber}` : `${entry.setsPlayed} sets`,
        scope,
    ];
    return parts.filter(Boolean).join(" · ");
}

export default async function RecordsRoute({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const parsed = RecordsParamsSchema.safeParse(await searchParams);
    if (!parsed.success) notFound();

    const payload = await getCachedRecords(parsed.data.region ?? null, parsed.data.season ?? null);
    if (!payload) notFound();

    return (
        <div className="mx-auto max-w-[1400px] px-7 pb-20 pt-6">
            <h1 className="mb-5 text-2xl font-semibold tracking-[-.025em]">Records</h1>
            {(["set", "match", "season"] as const).map(grain => (
                <section key={grain} className="mb-10">
                    <h2 className="mb-3 text-lg font-semibold">{GRAIN_LABELS[grain]}</h2>
                    {payload.book.player[grain].map(group => (
                        <div key={group.category} className="mb-4">
                            <h3 className="text-sm font-semibold">{group.label}</h3>
                            <ol className="text-sm">
                                {group.entries.map(entry => (
                                    <li key={entry.rowNum} className="flex gap-3">
                                        <span className="w-6 font-mono tabular-nums">{entry.rank}</span>
                                        <span className="w-48">{entry.player?.displayName ?? entry.player?.username}</span>
                                        <span className="w-10 font-mono tabular-nums">{entry.value}</span>
                                        <span className="text-muted-foreground">{contextLine(entry)}</span>
                                    </li>
                                ))}
                            </ol>
                            {group.tiedBeyond > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    +{group.tiedBeyond} more tied at {group.entries[group.entries.length - 1].value}
                                </p>
                            )}
                        </div>
                    ))}
                </section>
            ))}
        </div>
    );
}
