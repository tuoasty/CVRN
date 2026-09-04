import Link from "next/link";
import Image from "next/image";
import { Globe, Trophy, Medal } from "lucide-react";
import { getCachedArchive, getCachedRegions } from "@/server/cache/publicReads";
import { logger } from "@/server/utils/logger";
import { ArchiveSeason } from "@/server/domains/season";

const PLACE_META = {
    1: { label: "Champion", color: "text-secondary", Icon: Trophy },
    2: { label: "Runner-Up", color: "text-muted-foreground", Icon: Medal },
    3: { label: "3rd Place", color: "text-muted-foreground", Icon: Medal },
} as const;

function TeamLogo({ name, logoUrl, size = 24 }: { name: string; logoUrl: string | null; size?: number }) {
    if (logoUrl) {
        return (
            <Image
                src={logoUrl}
                alt={name}
                width={size}
                height={size}
                style={{ width: size, height: size }}
                className="rounded-sm object-contain mix-blend-multiply dark:mix-blend-screen"
            />
        );
    }
    return (
        <div
            className="rounded-sm flex items-center justify-center font-bold bg-primary/10 text-primary shrink-0"
            style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
        >
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

function PodiumEntry({ entry }: { entry: ArchiveSeason["season_podium"][number] }) {
    const place = entry.place as 1 | 2 | 3;
    const meta = PLACE_META[place] ?? { label: `${place}th`, color: "text-muted-foreground", Icon: Medal };
    const { label, color, Icon } = meta;
    return (
        <div className={`flex items-center gap-2 ${place !== 1 ? "opacity-80" : ""}`}>
            <Icon className={`h-4 w-4 shrink-0 ${color}`} />
            <TeamLogo name={entry.teams.name} logoUrl={entry.teams.logo_url} size={place === 1 ? 36 : 24} />
            <div>
                <p className={`font-semibold leading-none ${place === 1 ? "text-base" : "text-sm"}`}>
                    {entry.teams.name}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            </div>
        </div>
    );
}

function SeasonCard({ season, regionCode }: { season: ArchiveSeason; regionCode: string }) {
    const sorted = [...season.season_podium].filter(e => e.place <= 3).sort((a, b) => a.place - b.place);
    const fmt = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "?";

    return (
        <Link href={`/${regionCode.toLowerCase()}/${season.slug}/archive`} prefetch={false} className="block group">
            <div className="panel p-5 space-y-4 group-hover:border-primary/40 transition-colors cursor-pointer">
                <div>
                    <h2 className="text-lg font-bold uppercase tracking-wider text-foreground">
                        {season.name}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {fmt(season.start_date)}{season.end_date ? ` – ${fmt(season.end_date)}` : ""}
                    </p>
                </div>
                {sorted.length > 0 ? (
                    <div className="space-y-2.5 border-l-2 border-primary/20 pl-4">
                        {sorted.map(e => <PodiumEntry key={e.place} entry={e} />)}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground italic">Results not yet recorded.</p>
                )}
            </div>
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
            seasons: archive.filter(s => s.region_id === r.id),
        }))
        .filter(g => g.seasons.length > 0);

    return (
        <div className="page-wide space-y-10 py-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                    <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold uppercase tracking-wider text-foreground">
                        League History
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">All regions · Season champions and awards</p>
                </div>
            </div>

            {byRegion.length === 0 && (
                <div className="panel p-6 text-center">
                    <p className="text-muted-foreground">No archived seasons found.</p>
                </div>
            )}

            {byRegion.map(({ region, seasons }) => (
                <div key={region.id} className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground px-2 py-1 rounded-sm">
                            {region.code}
                        </span>
                        <span className="text-sm text-muted-foreground">{region.name}</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {seasons.map(s => (
                            <SeasonCard key={s.id} season={s} regionCode={region.code} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
