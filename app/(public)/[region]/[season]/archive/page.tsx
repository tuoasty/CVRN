import { Suspense, Fragment } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Trophy, ChevronLeft } from "lucide-react";
import { getCachedSeasonHistoryDetail, getCachedRegions } from "@/server/cache/publicReads";
import { SeasonDetail } from "@/server/domains/season";
import { Skeleton } from "@/app/components/ui/skeleton";
import { buildPublicTeamHref, buildPublicPlayerHref } from "@/app/utils/matchDetailHref";

function TeamLogoSmall({ name, logoUrl, size = 28, priority = false }: { name: string; logoUrl: string | null; size?: number; priority?: boolean }) {
    if (logoUrl) {
        return (
            <Image src={logoUrl} alt={name} width={size} height={size} style={{ width: size, height: size }} className="rounded-sm object-contain shrink-0" priority={priority} />
        );
    }
    return (
        <div className="rounded-sm flex items-center justify-center font-bold bg-primary/10 text-primary shrink-0" style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}>
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

function getAwardTeam(award: SeasonDetail["season_awards"][number], seasonId: string) {
    const pts = award.players.player_team_seasons?.find(p => p.season_id === seasonId);
    return pts?.teams ?? null;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-baseline gap-2 border-b border-border pb-1.5 mb-3.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</span>
        </div>
    );
}

function AvatarTile({ url, name, className }: { url: string | null; name: string; className?: string }) {
    return (
        <div className={`relative overflow-hidden ${url ? "" : "bg-muted"} ${className ?? ""}`}>
            {url ? (
                <Image src={url} alt={name} fill className="object-cover object-top" sizes="15vw" unoptimized />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">{name.slice(0, 2).toUpperCase()}</span>
                </div>
            )}
        </div>
    );
}

function ChampionMasthead({ podium, regionCode, seasonSlug }: { podium: SeasonDetail["season_podium"]; regionCode: string; seasonSlug: string }) {
    const sorted = [...podium].filter(e => e.place <= 3).sort((a, b) => a.place - b.place);
    const champion = sorted.find(e => e.place === 1);
    const runners = sorted.filter(e => e.place !== 1);
    if (!champion) return null;
    const champHref = buildPublicTeamHref({ regionCode, seasonSlug, teamSlug: champion.teams.slug });
    const name = <span className="text-2xl font-bold tracking-tight leading-none">{champion.teams.name}</span>;
    return (
        <div className="border-t-2 border-foreground border-b border-border pt-3.5 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 text-secondary" /> Champion
            </div>
            <div className="flex items-center gap-3.5 mt-2.5 flex-wrap">
                <TeamLogoSmall name={champion.teams.name} logoUrl={champion.teams.logo_url} size={48} priority />
                {champHref ? <Link href={champHref} prefetch={false} className="hover:text-primary transition-colors">{name}</Link> : name}
                {runners.length > 0 && (
                    <div className="ml-auto flex flex-col gap-1.5 items-end">
                        {runners.map(r => {
                            const href = buildPublicTeamHref({ regionCode, seasonSlug, teamSlug: r.teams.slug });
                            const line = (
                                <div className="flex items-center gap-2 justify-end text-xs text-muted-foreground">
                                    <span>{r.place === 2 ? "Runner-up" : "3rd place"} <span className="text-foreground font-semibold">{r.teams.name}</span></span>
                                    <TeamLogoSmall name={r.teams.name} logoUrl={r.teams.logo_url} size={22} />
                                </div>
                            );
                            return href
                                ? <Link key={r.place} href={href} prefetch={false} className="hover:opacity-80 transition-opacity">{line}</Link>
                                : <div key={r.place}>{line}</div>;
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function AwardCard({ award, seasonId }: { award: SeasonDetail["season_awards"][number]; seasonId: string }) {
    const { award_name, full_avatar_url, players } = award;
    const team = getAwardTeam(award, seasonId);
    const playerHref = buildPublicPlayerHref(players.username);
    const inner = (
        <div className="border border-border h-full flex flex-col hover:border-primary/40 transition-colors">
            <div className="bg-muted/50 border-b border-border px-2 h-[52px] flex items-center justify-center overflow-hidden">
                <p className="text-sm font-bold uppercase tracking-wide text-center leading-tight break-words">{award_name}</p>
            </div>
            <AvatarTile url={full_avatar_url} name={players.username ?? "?"} className="aspect-[4/5]" />
            <div className="px-2 py-2 text-center">
                <p className="text-sm font-semibold leading-tight truncate">{players.display_name ?? players.username}</p>
                <p className="text-[10px] text-muted-foreground truncate">@{players.username}</p>
                {team && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                        <TeamLogoSmall name={team.name} logoUrl={team.logo_url} size={12} />
                        <span className="text-[10px] text-muted-foreground truncate">{team.name}</span>
                    </div>
                )}
            </div>
        </div>
    );
    if (!playerHref) return inner;
    return <Link href={playerHref} prefetch={false} className="block h-full">{inner}</Link>;
}

function FirstTeamRow({ award, seasonId }: { award: SeasonDetail["season_awards"][number]; seasonId: string }) {
    const { award_name, full_avatar_url, players } = award;
    const team = getAwardTeam(award, seasonId);
    const href = buildPublicPlayerHref(players.username);
    const inner = (
        <div className="flex items-stretch h-16 overflow-hidden border border-border hover:border-primary/40 transition-colors">
            <div className="relative w-14 shrink-0 overflow-hidden">
                {full_avatar_url ? (
                    <Image src={full_avatar_url} alt={players.username ?? "Player"} fill className="object-cover object-top" sizes="56px" unoptimized />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                        <span className="text-sm font-bold text-muted-foreground">{(players.username ?? "?").slice(0, 2).toUpperCase()}</span>
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center px-3">
                <p className="text-sm font-semibold leading-tight truncate">{players.display_name ?? players.username}</p>
                <p className="text-xs text-muted-foreground truncate">
                    <span className="font-semibold uppercase text-foreground/70">{award_name}</span>{team ? ` · ${team.name}` : ""}
                </p>
            </div>
        </div>
    );
    if (!href) return inner;
    return <Link href={href} prefetch={false} className="block">{inner}</Link>;
}

function FirstTeamList({ awards, seasonId }: { awards: SeasonDetail["season_awards"]; seasonId: string }) {
    return (
        <div className="space-y-2">
            {awards.map(a => <FirstTeamRow key={a.id} award={a} seasonId={seasonId} />)}
        </div>
    );
}

function StaffTable({ awards }: { awards: SeasonDetail["season_awards"] }) {
    return (
        <div className="panel overflow-x-auto">
            <table className="table-dense text-sm w-full">
                <thead>
                    <tr><th className="text-left">Role</th><th className="text-left">Person</th></tr>
                </thead>
                <tbody>
                    {awards.map(a => {
                        const href = buildPublicPlayerHref(a.players.username);
                        const name = a.players.display_name ?? a.players.username;
                        return (
                            <tr key={a.id}>
                                <td className="text-muted-foreground">{a.award_name}</td>
                                <td>{href ? <Link href={href} prefetch={false} className="hover:text-primary transition-colors truncate">{name}</Link> : name}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function SpecWinnersTable({ winners }: { winners: SeasonDetail["spec_winners"] }) {
    const shown = [...winners].filter(w => w.stars_awarded > 0).sort((a, b) => b.stars_awarded - a.stars_awarded);
    if (shown.length === 0) return null;
    const tiers: Array<[number, SeasonDetail["spec_winners"]]> = [];
    for (const w of shown) {
        const last = tiers[tiers.length - 1];
        if (last && last[0] === w.stars_awarded) last[1].push(w);
        else tiers.push([w.stars_awarded, [w]]);
    }
    return (
        <div className="panel overflow-x-auto">
            <table className="table-dense text-sm w-full">
                <thead>
                    <tr><th className="text-left">Spec</th><th className="text-left">Player</th><th className="text-right w-20">Stars</th></tr>
                </thead>
                <tbody>
                    {tiers.map(([tier, list]) => (
                        <Fragment key={tier}>
                            <tr className="bg-muted/50">
                                <td colSpan={3} className="py-1.5">
                                    <span className="font-mono tabular-nums text-secondary">{"★".repeat(tier)}</span>
                                    <span className="text-xs uppercase tracking-wider text-muted-foreground ml-2">{tier}-star</span>
                                </td>
                            </tr>
                            {list.map(w => {
                                const player = w.players;
                                const href = player ? buildPublicPlayerHref(player.username) : null;
                                const who = player ? (player.display_name ?? player.username) : "—";
                                return (
                                    <tr key={w.id}>
                                        <td className="font-medium">{w.specs?.name ?? "—"}{w.specs?.position ? <span className="text-muted-foreground"> · {w.specs.position}</span> : ""}</td>
                                        <td className="text-muted-foreground">{href ? <Link href={href} prefetch={false} className="hover:text-primary transition-colors">{who}</Link> : who}</td>
                                        <td className="text-right font-mono tabular-nums text-secondary whitespace-nowrap">
                                            {"★".repeat(w.stars_awarded)}<span className="text-muted-foreground/40">{"★".repeat(5 - w.stars_awarded)}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const ROSTER_ROLE_RANK: Record<string, number> = { captain: 0, vice_captain: 1, court_captain: 2 };
const ROSTER_ROLE_LABEL: Record<string, string> = { captain: "C", vice_captain: "VC", court_captain: "CC" };

function RosterCard({ award }: { award: SeasonDetail["season_awards"][number] }) {
    const { award_name, full_avatar_url, players } = award;
    const roleLabel = ROSTER_ROLE_LABEL[award_name];
    const href = buildPublicPlayerHref(players.username);
    const inner = (
        <div className="group">
            <AvatarTile url={full_avatar_url} name={players.username ?? "?"} className="aspect-[3/4] group-hover:opacity-90 transition-opacity" />
            <p className="text-xs font-semibold text-center leading-tight truncate mt-1.5">{players.display_name ?? players.username}</p>
            {roleLabel && <p className="text-xs uppercase tracking-wider text-muted-foreground text-center font-semibold">{roleLabel}</p>}
        </div>
    );
    if (!href) return inner;
    return <Link href={href} prefetch={false}>{inner}</Link>;
}

function ChampionRosterBand({ awards }: { awards: SeasonDetail["season_awards"] }) {
    const sorted = [...awards].sort((a, b) => (ROSTER_ROLE_RANK[a.award_name] ?? 3) - (ROSTER_ROLE_RANK[b.award_name] ?? 3));
    return (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
            {sorted.map(a => <RosterCard key={a.id} award={a} />)}
        </div>
    );
}

function SeasonDetailSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-baseline justify-between">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-3.5 w-36" />
            </div>
            <Skeleton className="h-16 w-full rounded-sm" />
            <div className="grid grid-cols-1 lg:grid-cols-[1.12fr_.88fr] gap-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-sm" />)}
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full rounded-sm" />
                    <Skeleton className="h-32 w-full rounded-sm" />
                </div>
            </div>
        </div>
    );
}

async function SeasonDetailContent({ slug, regionCode, seasonSlug }: { slug: string; regionCode: string; seasonSlug: string }) {
    const [season, regions] = await Promise.all([
        getCachedSeasonHistoryDetail(slug, regionCode),
        getCachedRegions(),
    ]);

    if (!season) notFound();

    const matchedRegion = regions.find(r => r.code.toLowerCase() === regionCode.toLowerCase());
    if (!matchedRegion || matchedRegion.id !== season.region_id) notFound();

    const regionName = matchedRegion.name;
    const fmt = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "?";

    const podium = season.season_podium ?? [];
    const awards = season.season_awards ?? [];
    const specWinners = season.spec_winners ?? [];

    const individualAwards = awards.filter(a => a.category === "individual_winners");
    const firstTeamAwards = awards.filter(a => a.category === "first_team");
    const staffTeamAwards = awards.filter(a => a.category === "staff_team");
    const championRoster = awards.filter(a => a.category === "champion_roster");
    const specShown = specWinners.filter(w => w.stars_awarded > 0);

    const hasPodium = podium.length > 0;
    const hasColumns = individualAwards.length > 0 || firstTeamAwards.length > 0 || staffTeamAwards.length > 0 || specShown.length > 0;
    const hasContent = hasPodium || hasColumns || championRoster.length > 0;

    return (
        <>
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">{season.name}</h1>
                <p className="text-xs text-muted-foreground">
                    {regionName} · {fmt(season.start_date)}{season.end_date ? ` – ${fmt(season.end_date)}` : ""}
                </p>
            </div>

            {hasPodium && <ChampionMasthead podium={podium} regionCode={regionCode} seasonSlug={seasonSlug} />}

            {hasColumns && (
                <div className="grid grid-cols-1 lg:grid-cols-[1.12fr_.88fr] gap-8">
                    <div>
                        {individualAwards.length > 0 && (
                            <>
                                <SectionLabel>Individual Awards</SectionLabel>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {individualAwards.map(a => <AwardCard key={a.id} award={a} seasonId={season.id} />)}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="space-y-6">
                        {specShown.length > 0 && (
                            <div>
                                <SectionLabel>Spec Winners</SectionLabel>
                                <SpecWinnersTable winners={specWinners} />
                            </div>
                        )}
                        {firstTeamAwards.length > 0 && (
                            <div>
                                <SectionLabel>First Team</SectionLabel>
                                <FirstTeamList awards={firstTeamAwards} seasonId={season.id} />
                            </div>
                        )}
                        {staffTeamAwards.length > 0 && (
                            <div>
                                <SectionLabel>Staff Team</SectionLabel>
                                <StaffTable awards={staffTeamAwards} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {championRoster.length > 0 && (
                <div>
                    <SectionLabel>Champion Roster</SectionLabel>
                    <ChampionRosterBand awards={championRoster} />
                </div>
            )}

            {!hasContent && (
                <div className="flex items-center justify-center min-h-40">
                    <p className="text-muted-foreground text-sm">Results not yet recorded.</p>
                </div>
            )}
        </>
    );
}

export default async function ArchivePage({ params }: { params: Promise<{ region: string; season: string }> }) {
    const { region, season } = await params;

    return (
        <div className="page-narrow space-y-6 py-6">
            <Link
                href="/archive"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeft className="h-3.5 w-3.5" />
                All Seasons
            </Link>

            <Suspense fallback={<SeasonDetailSkeleton />}>
                <SeasonDetailContent slug={season} regionCode={region} seasonSlug={season} />
            </Suspense>
        </div>
    );
}
