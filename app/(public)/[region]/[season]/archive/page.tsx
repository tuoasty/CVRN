import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { DefaultTeamLogo } from "@/app/components/ui/DefaultTeamLogo";
import { Trophy, ChevronLeft } from "lucide-react";
import { getCachedSeasonHistoryDetail, getCachedRegions } from "@/server/cache/publicReads";
import { SeasonDetail } from "@/server/domains/season";
import { Skeleton } from "@/app/components/ui/skeleton";
import { buildPublicTeamHref, buildPublicPlayerHref } from "@/app/utils/matchDetailHref";
import GfxFrame from "@/app/features/media/GfxFrame";
import { getLogoClassName } from "@/app/lib/logoClass";
import { cn } from "@/lib/utils";

const LOGO_SHADOW =
    "[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.65))_drop-shadow(0_1px_3px_rgba(0,0,0,0.85))]";

const CHAMPION_SCRIM =
    "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.30) 12%, transparent 34%)";

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
    const rows = (award.players.player_team_seasons ?? []).filter(p => p.season_id === seasonId);
    const active = rows.find(p => p.left_at == null);
    const latest = active ?? [...rows].sort((a, b) => (b.joined_at ?? "").localeCompare(a.joined_at ?? ""))[0];
    return latest?.teams ?? null;
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

function ChampionGfxHero({ gfx, podium, regionCode, seasonSlug }: { gfx: { image_url: string | null; title: string }; podium: SeasonDetail["season_podium"]; regionCode: string; seasonSlug: string }) {
    if (!gfx.image_url) return null;

    const sorted = [...podium].filter(e => e.place <= 3).sort((a, b) => a.place - b.place);
    const champion = sorted.find(e => e.place === 1);
    const runnerUp = sorted.find(e => e.place === 2);
    const third = sorted.find(e => e.place === 3);

    const teamHref = (slug: string) =>
        buildPublicTeamHref({ regionCode: regionCode.toLowerCase(), seasonSlug, teamSlug: slug });
    const championHref = champion ? teamHref(champion.teams.slug) : null;

    const RankRow = ({ place, entry }: { place: number; entry: typeof sorted[number] }) => {
        const href = teamHref(entry.teams.slug);
        const inner = (
            <>
                <span className="font-mono tabular-nums text-sm font-bold uppercase tracking-wide text-muted-foreground shrink-0">{place === 2 ? "2nd" : "3rd"}</span>
                {entry.teams.logo_url ? (
                    <div className="relative w-9 h-9 shrink-0">
                        <Image src={entry.teams.logo_url} alt={entry.teams.name} fill sizes="36px" className={getLogoClassName(true)} />
                    </div>
                ) : (
                    <div className="relative w-9 h-9 shrink-0">
                        <DefaultTeamLogo sizes="36px" alt={entry.teams.name} />
                    </div>
                )}
                <span className="text-base font-semibold text-foreground truncate">{entry.teams.name}</span>
            </>
        );
        return href ? (
            <Link href={href} prefetch={false} className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity">{inner}</Link>
        ) : (
            <div className="flex items-center gap-2.5 min-w-0">{inner}</div>
        );
    };

    return (
        <div className="border-t-2 border-foreground border-b border-border pt-3.5 pb-4">
            <div className="mx-auto w-full max-w-[calc(60vh*16/9)]">
                <div className="relative w-full aspect-video overflow-hidden bg-black">
                    <GfxFrame src={gfx.image_url} alt={gfx.title} sizes="100vw" priority className="absolute inset-0 w-full h-full" />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: CHAMPION_SCRIM }} />
                    {champion && championHref && (
                        <Link href={championHref} prefetch={false} className="absolute inset-0 z-10" aria-label={champion.teams.name} />
                    )}
                    {champion && (
                        <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none flex flex-col items-center gap-2.5 px-4 pt-12 pb-5">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Champion</span>
                            <div className="flex items-center gap-3.5 min-w-0">
                                {champion.teams && (
                                    <div className="relative w-12 h-12 shrink-0">
                                        {champion.teams.logo_url ? (
                                            <Image src={champion.teams.logo_url} alt={champion.teams.name} fill sizes="48px" className={cn("object-contain", LOGO_SHADOW)} />
                                        ) : (
                                            <DefaultTeamLogo sizes="48px" alt={champion.teams.name} />
                                        )}
                                    </div>
                                )}
                                <span className="text-2xl sm:text-3xl font-bold text-white truncate">{champion.teams.name}</span>
                            </div>
                        </div>
                    )}
                </div>

                {(runnerUp || third) && (
                    <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
                        {runnerUp ? <RankRow place={2} entry={runnerUp} /> : <div />}
                        {third ? <RankRow place={3} entry={third} /> : <div />}
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

function SpecWinnersSection({ winners }: { winners: SeasonDetail["spec_winners"] }) {
    const shown = winners.filter(w => w.specs);
    if (shown.length === 0) return null;
    const tiers = [5, 4, 3]
        .map(tier => ({
            tier,
            list: shown
                .filter(w => (w.specs?.stars ?? 0) === tier)
                .sort((a, b) => {
                    const aDrop = a.stars_awarded < (a.specs?.stars ?? 0) ? 1 : 0;
                    const bDrop = b.stars_awarded < (b.specs?.stars ?? 0) ? 1 : 0;
                    if (aDrop !== bDrop) return aDrop - bDrop;
                    return (a.specs?.name ?? "").localeCompare(b.specs?.name ?? "");
                }),
        }))
        .filter(t => t.list.length > 0);

    return (
        <div>
            {tiers.map(({ tier, list }, i) => (
                <div key={tier} className={i > 0 ? "mt-3.5" : ""}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono tabular-nums text-secondary text-sm tracking-[0.15em] leading-none">{"★".repeat(tier)}</span>
                        <span className="flex-1 h-px bg-border" />
                    </div>
                    {list.map(w => <SpecWinnerRow key={w.id} winner={w} />)}
                </div>
            ))}
        </div>
    );
}

function SpecWinnerRow({ winner }: { winner: SeasonDetail["spec_winners"][number] }) {
    const spec = winner.specs;
    const player = winner.players;
    const dropped = spec ? winner.stars_awarded < spec.stars : false;
    const href = player ? buildPublicPlayerHref(player.username) : null;
    const inner = (
        <div className="flex items-center gap-2.5 py-1.5 border-b border-border last:border-0">
            <AvatarTile url={player?.avatar_url ?? null} name={player?.username ?? "?"} className="w-8 h-8 shrink-0 rounded-sm" />
            <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold">{spec?.name ?? "—"}</span>
                {spec?.position && <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1.5">{spec.position}</span>}
                {dropped && <span className="italic text-[10px] text-muted-foreground ml-1.5">dropped</span>}
            </div>
            {player && (
                <div className="text-right min-w-0 shrink">
                    <p className="text-sm font-medium leading-tight truncate">{player.display_name ?? player.username}</p>
                    <p className="text-[10px] text-muted-foreground truncate">@{player.username}</p>
                </div>
            )}
        </div>
    );
    if (!href) return inner;
    return <Link href={href} prefetch={false} className="block hover:bg-muted/30 transition-colors">{inner}</Link>;
}

type SeasonAwardEntry = SeasonDetail["season_awards"][number];

function AllStarTile({ award, headshot, className }: { award: SeasonAwardEntry; headshot?: boolean; className?: string }) {
    const { award_name, full_avatar_url, players } = award;
    const href = buildPublicPlayerHref(players.username);
    const displayName = players.display_name ?? players.username;
    const avatar = (
        <AvatarTile
            url={headshot ? players.avatar_url : full_avatar_url}
            name={players.username ?? "?"}
            className={cn(headshot ? "aspect-square" : "aspect-[3/4]", "group-hover:opacity-90 transition-opacity")}
        />
    );
    const inner = (
        <div className="group min-w-0">
            <div className="relative">
                {avatar}
                {award.all_star_captain && (
                    <span className="absolute top-0 left-0 w-4 h-4 flex items-center justify-center bg-foreground text-background text-xs font-bold leading-none" title="Captain">C</span>
                )}
            </div>
            <p
                className="text-[11px] font-semibold text-center leading-tight truncate mt-1.5"
                title={`${displayName} (@${players.username})`}
            >
                {displayName}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground text-center font-semibold truncate">{award_name}</p>
        </div>
    );
    const wrapperClass = cn("block min-w-0", className);
    if (!href) return <div className={wrapperClass}>{inner}</div>;
    return <Link href={href} prefetch={false} className={wrapperClass}>{inner}</Link>;
}

function AllStarTeamHalf({ code, name, awards }: { code: string; name: string; awards: SeasonAwardEntry[] }) {
    const starters = awards
        .filter(a => a.all_star_slot === "starter")
        .sort((a, b) => Number(b.all_star_captain) - Number(a.all_star_captain) || a.sort_order - b.sort_order);
    const subs = awards
        .filter(a => a.all_star_slot === "sub")
        .sort((a, b) => a.sort_order - b.sort_order);
    return (
        <div className="min-w-0">
            <div className="flex items-center gap-2.5 border-t-2 border-foreground pt-2.5 mb-3">
                <span className="inline-flex items-center justify-center w-[22px] h-[22px] border border-border font-mono text-xs font-semibold text-muted-foreground">{code}</span>
                <span className="text-lg font-semibold uppercase tracking-tight truncate">{name}</span>
            </div>
            {starters.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                    {starters.map(a => a.all_star_captain
                        ? <AllStarTile key={a.id} award={a} className="row-span-2 self-center" />
                        : <AllStarTile key={a.id} award={a} />
                    )}
                </div>
            )}
            {subs.length > 0 && (
                <div className={cn("grid grid-cols-4 sm:grid-cols-7 gap-2", starters.length > 0 && "mt-4")}>
                    {subs.map(a => <AllStarTile key={a.id} award={a} headshot />)}
                </div>
            )}
        </div>
    );
}

function AllStarSection({ awards, teams }: { awards: SeasonAwardEntry[]; teams: SeasonDetail["all_star_teams"] }) {
    const halves = (["A", "B"] as const)
        .map(code => ({
            code,
            name: teams.find(t => t.code === code)?.name ?? `Team ${code}`,
            awards: awards.filter(a => a.all_star_team === code),
        }))
        .filter(h => h.awards.length > 0);
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-7 lg:divide-x lg:divide-border">
            {halves.map((h, i) => (
                <div key={h.code} className={cn("min-w-0", i === 0 ? "lg:pr-5" : "lg:pl-5")}>
                    <AllStarTeamHalf code={h.code} name={h.name} awards={h.awards} />
                </div>
            ))}
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
    const cols = Math.max(1, Math.ceil(sorted.length / 2));
    return (
        <div
            className="grid grid-cols-4 sm:grid-cols-6 gap-3 lg:[grid-template-columns:repeat(var(--roster-cols),minmax(0,1fr))]"
            style={{ "--roster-cols": cols } as React.CSSProperties}
        >
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
    const gfx = season.champion_gfx?.[0] ?? null;

    const individualAwards = awards.filter(a => a.category === "individual_winners");
    const firstTeamAwards = awards.filter(a => a.category === "first_team");
    const staffTeamAwards = awards.filter(a => a.category === "staff_team");
    const championRoster = awards.filter(a => a.category === "champion_roster");
    const allStarAwards = awards.filter(a => a.category === "all_star");
    const allStarTeams = season.all_star_teams ?? [];
    const specShown = specWinners.filter(w => w.specs);

    const hasPodium = podium.length > 0;
    const hasGfx = !!gfx?.image_url;
    const hasColumns = individualAwards.length > 0 || firstTeamAwards.length > 0 || staffTeamAwards.length > 0 || specShown.length > 0;
    const hasContent = hasPodium || hasGfx || hasColumns || allStarAwards.length > 0 || championRoster.length > 0;

    return (
        <>
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">{season.name}</h1>
                <p className="text-xs text-muted-foreground">
                    {regionName} · {fmt(season.start_date)}{season.end_date ? ` – ${fmt(season.end_date)}` : ""}
                </p>
            </div>

            {hasGfx
                ? <ChampionGfxHero gfx={gfx!} podium={podium} regionCode={regionCode} seasonSlug={seasonSlug} />
                : hasPodium && <ChampionMasthead podium={podium} regionCode={regionCode} seasonSlug={seasonSlug} />}

            {hasColumns && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7 items-start">
                    {individualAwards.length > 0 && (
                        <section>
                            <SectionLabel>Individual Awards</SectionLabel>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {individualAwards.map(a => <AwardCard key={a.id} award={a} seasonId={season.id} />)}
                            </div>
                        </section>
                    )}
                    {specShown.length > 0 && (
                        <section>
                            <SectionLabel>Spec Winners</SectionLabel>
                            <SpecWinnersSection winners={specWinners} />
                        </section>
                    )}
                    {firstTeamAwards.length > 0 && (
                        <section>
                            <SectionLabel>First Team</SectionLabel>
                            <FirstTeamList awards={firstTeamAwards} seasonId={season.id} />
                        </section>
                    )}
                    {staffTeamAwards.length > 0 && (
                        <section>
                            <SectionLabel>Staff Team</SectionLabel>
                            <StaffTable awards={staffTeamAwards} />
                        </section>
                    )}
                </div>
            )}

            {allStarAwards.length > 0 && (
                <div>
                    <SectionLabel>All-Star</SectionLabel>
                    <AllStarSection awards={allStarAwards} teams={allStarTeams} />
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
