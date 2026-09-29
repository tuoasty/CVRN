"use client";

import {BookOpen, Trophy, Medal, Globe} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {useArchive} from "@/app/hooks/useArchive";
import {useRegions} from "@/app/hooks/useRegions";
import {useSeasonContext} from "@/app/(public)/[region]/[season]/context";
import {ArchiveSeason} from "@/server/domains/season";
import {Skeleton} from "@/app/components/ui/skeleton";
import GfxFrame from "@/app/features/media/GfxFrame";
import {buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import {cn} from "@/lib/utils";

const LOGO_SHADOW =
    "[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.65))_drop-shadow(0_1px_3px_rgba(0,0,0,0.85))]";

const CHAMPION_SCRIM =
    "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.30) 12%, transparent 34%)";

function LogoCoin({name, logoUrl, size = 22}: {name: string; logoUrl: string | null; size?: number}) {
    if (logoUrl) {
        return (
            <div className="bg-white flex items-center justify-center shrink-0" style={{width: size, height: size, boxShadow: "0 1px 3px rgba(0,0,0,0.4)"}}>
                <div className="relative" style={{width: Math.round(size * 0.72), height: Math.round(size * 0.72)}}>
                    <Image src={logoUrl} alt={name} fill sizes={`${size}px`} className="object-contain" />
                </div>
            </div>
        );
    }
    return (
        <div className="flex items-center justify-center font-bold text-[9px] bg-primary/10 text-primary shrink-0" style={{width: size, height: size}}>
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

function FeaturedChampion({season, regionCode}: {season: ArchiveSeason; regionCode: string}) {
    const gfx = season.champion_gfx?.[0];
    if (!gfx?.image_url) return null;

    const sorted = [...season.season_podium].filter(e => e.place <= 3).sort((a, b) => a.place - b.place);
    const champion = sorted.find(e => e.place === 1);
    const runnerUp = sorted.find(e => e.place === 2);
    const third = sorted.find(e => e.place === 3);

    const fmt = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("en-US", {month: "short", year: "numeric"}) : "?";

    const teamHref = (slug: string) =>
        buildPublicTeamHref({regionCode: regionCode.toLowerCase(), seasonSlug: season.slug, teamSlug: slug});

    const championHref = champion ? teamHref(champion.teams.slug) : null;

    const RankRow = ({place, entry}: {place: number; entry: typeof sorted[number]}) => {
        const href = teamHref(entry.teams.slug);
        const inner = (
            <>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">{place === 2 ? "2nd" : "3rd"}</span>
                <LogoCoin name={entry.teams.name} logoUrl={entry.teams.logo_url} />
                <span className="text-sm text-foreground/90 truncate">{entry.teams.name}</span>
            </>
        );
        return href ? (
            <Link href={href} prefetch={false} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                {inner}
            </Link>
        ) : (
            <div className="flex items-center gap-2 min-w-0">{inner}</div>
        );
    };

    return (
        <div className="panel p-4 sm:p-5">
            <p className="text-center text-xs text-muted-foreground uppercase tracking-wider mb-3">
                <b className="text-foreground font-semibold">{season.name}</b> · {fmt(season.start_date)}{season.end_date ? ` – ${fmt(season.end_date)}` : ""}
            </p>

            <div className="relative mx-auto max-w-[520px] aspect-video overflow-hidden bg-black">
                <GfxFrame src={gfx.image_url} alt={gfx.title} sizes="520px" className="absolute inset-0 w-full h-full" />
                <div className="absolute inset-0 pointer-events-none" style={{background: CHAMPION_SCRIM}} />
                {champion && championHref && (
                    <Link href={championHref} prefetch={false} className="absolute inset-0 z-10" aria-label={champion.teams.name} />
                )}
                {champion && (
                    <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none flex flex-col items-center gap-2 px-4 pt-10 pb-4">
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Champion</span>
                        <div className="flex items-center gap-3 min-w-0">
                            {champion.teams.logo_url && (
                                <div className="relative w-9 h-9 shrink-0">
                                    <Image src={champion.teams.logo_url} alt={champion.teams.name} fill sizes="36px" className={cn("object-contain", LOGO_SHADOW)} />
                                </div>
                            )}
                            <span className="text-xl font-bold text-white truncate">{champion.teams.name}</span>
                        </div>
                    </div>
                )}
            </div>

            {(runnerUp || third) && (
                <div className="mx-auto max-w-[520px] mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
                    {runnerUp ? <RankRow place={2} entry={runnerUp} /> : <div />}
                    {third ? <RankRow place={3} entry={third} /> : <div />}
                </div>
            )}
        </div>
    );
}

const PLACE_META = {
    1: {label: "Champion",  color: "text-secondary", Icon: Trophy},
    2: {label: "Runner-Up", color: "text-muted-foreground",  Icon: Medal},
    3: {label: "3rd Place", color: "text-muted-foreground",  Icon: Medal},
} as const;

function TeamLogo({
    name,
    logoUrl,
    size = 24,
}: {
    name: string;
    logoUrl: string | null;
    size?: number;
}) {
    if (logoUrl) {
        return (
            <Image
                src={logoUrl}
                alt={name}
                width={size}
                height={size}
                style={{ width: size, height: size }}
                className="rounded-sm object-contain"
            />
        );
    }

    return (
        <div
            className="rounded-sm flex items-center justify-center font-bold bg-primary/10 text-primary shrink-0"
            style={{
                width: size,
                height: size,
                fontSize: Math.round(size * 0.35),
            }}
        >
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

function PodiumEntry({entry}: {entry: ArchiveSeason["season_podium"][number]}) {
    const place = entry.place as 1 | 2 | 3;
    const meta = PLACE_META[place] ?? {label: `${place}th`, color: "text-muted-foreground", Icon: Medal};
    const {label, color, Icon} = meta;

    return (
        <div className={`flex items-center gap-2 ${place !== 1 ? "opacity-80" : ""}`}>
            <Icon className={`h-4 w-4 shrink-0 ${color}`} />
            <TeamLogo
                name={entry.teams.name}
                logoUrl={entry.teams.logo_url}
                size={place === 1 ? 36 : 24}
            />
            <div>
                <p className={`font-semibold leading-none ${place === 1 ? "text-base" : "text-sm"}`}>
                    {entry.teams.name}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            </div>
        </div>
    );
}

function SeasonCard({season, regionName, regionCode, contextSeasonSlug}: {season: ArchiveSeason; regionName: string; regionCode: string; contextSeasonSlug: string}) {
    const sorted = [...season.season_podium].filter(e => e.place <= 3).sort((a, b) => a.place - b.place);
    const fmt = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("en-US", {month: "short", year: "numeric"}) : "?";

    return (
        <Link href={`/${regionCode.toLowerCase()}/${contextSeasonSlug}/archive/${season.slug}`} prefetch={false} className="block group">
        <div className="panel p-5 space-y-4 group-hover:border-primary/40 transition-colors cursor-pointer">
            <div>
                <h2 className="text-lg font-bold uppercase tracking-wider text-foreground">
                    {season.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {regionName} · {fmt(season.start_date)}{season.end_date ? ` – ${fmt(season.end_date)}` : ""}
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

export default function ArchivePage() {
    const {archive, isLoading, error} = useArchive();
    const {regions} = useRegions();
    const {region, season: contextSeason} = useSeasonContext();

    const regionMeta = (id: string) => {
        const r = regions.find(r => r.id === id);
        return {name: r?.name ?? "Unknown", code: r?.code ?? ""};
    };

    const filtered = archive.filter(s => s.region_id === region.id);
    const featured = filtered.find(s => s.champion_gfx?.[0]?.image_url) ?? null;
    const gridSeasons = featured ? filtered.filter(s => s.id !== featured.id) : filtered;

    return (
        <div className="page-wide space-y-6 py-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                        <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-foreground">
                            League History
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Season champions and awards</p>
                    </div>
                </div>
                <Link
                    href="/archive"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                    <Globe className="h-3.5 w-3.5" />
                    View all regions
                </Link>
            </div>

            {isLoading && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="panel p-5 space-y-4">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-3 w-24" />
                            <div className="space-y-2.5 pl-4">
                                <Skeleton className="h-6 w-48" />
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-5 w-36" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div className="panel p-6">
                    <p className="text-destructive text-sm">{error}</p>
                </div>
            )}

            {!isLoading && !error && filtered.length === 0 && (
                <div className="panel p-6 text-center">
                    <p className="text-muted-foreground">No seasons recorded for this region.</p>
                </div>
            )}

            {!isLoading && !error && featured && (
                <FeaturedChampion season={featured} regionCode={regionMeta(featured.region_id).code} />
            )}

            {!isLoading && !error && gridSeasons.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {gridSeasons.map(s => {
                        const {name, code} = regionMeta(s.region_id);
                        return (
                            <SeasonCard key={s.id} season={s} regionName={name} regionCode={code} contextSeasonSlug={contextSeason.slug} />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
