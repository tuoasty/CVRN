import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";
import { getCachedArchive, getCachedRegions } from "@/server/cache/publicReads";
import { logger } from "@/server/utils/logger";
import { cn } from "@/lib/utils";
import { ArchiveSeason } from "@/server/domains/season";

type PodiumRow = ArchiveSeason["season_podium"][number];

function fmt(d: string | null): string {
    return d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "?";
}

function TeamLogo({ name, logoUrl, size = 24 }: { name: string; logoUrl: string | null; size?: number }) {
    if (logoUrl) {
        return (
            <Image
                src={logoUrl}
                alt={name}
                width={size}
                height={size}
                style={{ width: size, height: size }}
                className="rounded-sm object-contain shrink-0"
            />
        );
    }
    return (
        <div
            className="rounded-sm flex items-center justify-center font-bold bg-primary/10 text-primary shrink-0"
            style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
        >
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

function RankRow({ place, entry }: { place: number; entry: PodiumRow }) {
    return (
        <div className="flex min-w-0 items-center gap-1.5">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{place}</span>
            <TeamLogo name={entry.teams.name} logoUrl={entry.teams.logo_url} size={18} />
            <span className="truncate text-xs text-foreground/90">{entry.teams.name}</span>
        </div>
    );
}

function SeasonEntry({ season, regionCode }: { season: ArchiveSeason; regionCode: string }) {
    const podium = [...season.season_podium].filter(e => e.place <= 3);
    const champion = podium.find(e => e.place === 1);
    const runnerUp = podium.find(e => e.place === 2);
    const third = podium.find(e => e.place === 3);

    if (!champion) return null;

    return (
        <Link
            href={`/${regionCode.toLowerCase()}/${season.slug}/archive`}
            prefetch={false}
            className="group block border-b border-border px-4 py-4 transition-colors hover:bg-muted/40"
        >
            <div className="mb-3 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-bold text-foreground">{season.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {fmt(season.start_date)}{season.end_date ? ` – ${fmt(season.end_date)}` : ""}
                </span>
            </div>

            <div className="flex items-center gap-3">
                <TeamLogo name={champion.teams.name} logoUrl={champion.teams.logo_url} size={38} />
                <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground leading-none">Champion</p>
                    <p className="mt-1 truncate text-base font-bold leading-none text-foreground transition-colors group-hover:text-primary">
                        {champion.teams.name}
                    </p>
                </div>
            </div>
            {(runnerUp || third) && (
                <div className="mt-3 flex gap-4 border-t border-border/60 pt-3">
                    {runnerUp && <RankRow place={2} entry={runnerUp} />}
                    {third && <RankRow place={3} entry={third} />}
                </div>
            )}
        </Link>
    );
}

export default async function GlobalArchivePage() {
    const [archive, regions] = await Promise.all([
        getCachedArchive().catch((error) => {
            logger.error({ error }, "GlobalArchivePage: failed to load archive");
            return [];
        }),
        getCachedRegions().catch((error) => {
            logger.error({ error }, "GlobalArchivePage: failed to load regions");
            return [];
        }),
    ]);

    const byRegion = regions
        .map(r => ({
            region: r,
            seasons: archive.filter(s => s.region_id === r.id && s.season_podium.some(e => e.place === 1)),
        }))
        .filter(g => g.seasons.length > 0);

    return (
        <div className="page-wide space-y-8 py-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-primary/20 bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">League History</h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">Every champion the league has crowned, by region</p>
                </div>
            </div>

            {byRegion.length === 0 ? (
                <div className="flex min-h-64 items-center justify-center">
                    <p className="text-sm text-muted-foreground">No archived seasons yet — completed seasons will appear here.</p>
                </div>
            ) : (
                <div className="flex flex-col border-t border-border xl:flex-row">
                    {byRegion.map(({ region, seasons }, i) => (
                        <div
                            key={region.id}
                            className={cn(
                                "xl:min-w-0 xl:flex-1",
                                i > 0 && "border-t border-border xl:border-t-0 xl:border-l",
                            )}
                        >
                            <div className="flex items-baseline gap-2 border-b border-border bg-muted/40 px-4 py-3">
                                <span className="text-sm font-semibold uppercase tracking-widest text-foreground">{region.code}</span>
                                <span className="truncate text-xs text-muted-foreground">{region.name}</span>
                                <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">{seasons.length}</span>
                            </div>
                            {seasons.map(s => (
                                <SeasonEntry key={s.id} season={s} regionCode={region.code} />
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
