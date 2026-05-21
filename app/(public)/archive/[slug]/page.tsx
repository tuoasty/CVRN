import {notFound} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {Trophy, Medal, Award, ChevronLeft, Users} from "lucide-react";
import {getSeasonDetailAction} from "@/app/actions/season.actions";
import {getAllRegionsAction} from "@/app/actions/region.actions";
import {SeasonDetail} from "@/server/domains/season";

// ─── Podium ──────────────────────────────────────────────────────────────────

function TeamLogoSmall({name, logoUrl, size = 28}: {name: string; logoUrl: string | null; size?: number}) {
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
            style={{width: size, height: size, fontSize: Math.round(size * 0.35)}}
        >
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

function ChampionCard({entry}: {entry: SeasonDetail["season_podium"][number]}) {
    return (
        <div className="panel p-6 flex flex-col items-center gap-3 bg-yellow-500/5 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <Trophy className="h-4 w-4" />
                <span className="text-[20px] uppercase tracking-[0.2em] font-semibold">Champion</span>
            </div>
            <TeamLogoSmall name={entry.teams.name} logoUrl={entry.teams.logo_url} size={144} />
            <p className="text-xl font-bold text-center">{entry.teams.name}</p>
        </div>
    );
}

function PlacementCard({entry}: {entry: SeasonDetail["season_podium"][number]}) {
    const place = entry.place as 2 | 3;
    const isSecond = place === 2;
    const label = isSecond ? "Runner-Up" : "3rd Place";
    const borderClass = isSecond
    ? "border-slate-400/20 bg-slate-400/5"
    : "border-amber-500/20 bg-amber-500/5";

    const accentClass = isSecond
    ? "text-slate-500 dark:text-slate-300"
    : "text-amber-600 dark:text-amber-400";

    return (
        <div className={`panel p-4 flex flex-col items-center gap-2 border ${borderClass}`}>
            <div className={`flex items-center gap-1.5 ${accentClass}`}>
                <Medal className="h-3.5 w-3.5" />
                <span className="text-[15px] uppercase tracking-[0.15em] font-semibold">{label}</span>
            </div>
            <TeamLogoSmall name={entry.teams.name} logoUrl={entry.teams.logo_url} size={108} />
            <p className="text-sm font-semibold text-center leading-tight">{entry.teams.name}</p>
        </div>
    );
}

function PodiumSection({entries}: {entries: SeasonDetail["season_podium"]}) {
    const sorted = [...entries].sort((a, b) => a.place - b.place);
    const champion = sorted.find(e => e.place === 1);
    const rest = sorted.filter(e => e.place !== 1);

    return (
        <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Podium
            </p>
            <div className="space-y-2">
                {champion && <ChampionCard entry={champion} />}
                {rest.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                        {rest.map(e => <PlacementCard key={e.place} entry={e} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Awards ──────────────────────────────────────────────────────────────────

function getAwardTeam(award: SeasonDetail["season_awards"][number], seasonId: string) {
    const pts = award.players.player_team_seasons?.find(p => p.season_id === seasonId);
    return pts?.teams ?? null;
}

function IndividualAwardCard({
    award,
    index,
    seasonId,
}: {
    award: SeasonDetail["season_awards"][number];
    index: number;
    seasonId: string;
}) {
    const {award_name, full_avatar_url, players} = award;
    const team = getAwardTeam(award, seasonId);
    const reversed = index % 2 === 1;

    const avatarBlock = (
        <div className="w-[20%] shrink-0 relative overflow-hidden">
            {full_avatar_url ? (
                <Image
                    src={full_avatar_url}
                    alt={players.username ?? "Player"}
                    fill
                    className="object-cover object-top"
                    sizes="20vw"
                />
            ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                        {(players.username ?? "?").slice(0, 2).toUpperCase()}
                    </span>
                </div>
            )}
        </div>
    );

    const teamBlock = (
        <div className="w-[20%] shrink-0 relative overflow-hidden bg-muted/30 dark:bg-muted/10">
            {team?.logo_url ? (
                <Image
                    src={team.logo_url}
                    alt={team.name}
                    fill
                    className="object-contain p-4 mix-blend-multiply dark:mix-blend-screen"
                    sizes="20vw"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xl font-bold text-muted-foreground/40">
                        {team?.name.slice(0, 2).toUpperCase() ?? "—"}
                    </span>
                </div>
            )}
        </div>
    );

    return (
        <div className="panel overflow-hidden bg-yellow-500/[0.04] dark:bg-yellow-500/[0.06] border-yellow-500/25">
            {/* Mobile: award name bar + 50/50 split */}
            <div className="sm:hidden">
                <div className="px-5 py-2.5 border-b border-yellow-500/20 bg-yellow-500/[0.04]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-yellow-500/80 font-semibold text-center">
                        {award_name}
                    </p>
                </div>
                <div className="flex h-40">
                    <div className={`w-1/2 relative shrink-0 overflow-hidden ${reversed ? "order-2" : "order-1"}`}>
                        {full_avatar_url ? (
                            <Image
                                src={full_avatar_url}
                                alt={players.username ?? "Player"}
                                fill
                                className="object-cover object-top"
                                sizes="50vw"
                            />
                        ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                <span className="text-3xl font-bold text-primary">
                                    {(players.username ?? "?").slice(0, 2).toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className={`w-1/2 flex flex-col justify-center gap-1.5 p-4 min-w-0 ${reversed ? "order-1" : "order-2"}`}>
                        <p className="text-sm font-bold leading-tight line-clamp-2">
                            {players.display_name ?? players.username}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 break-all">
                            @{players.username}
                        </p>
                        {team && (
                            <div className="flex items-center gap-1.5 mt-1">
                                {team.logo_url && (
                                    <div className="relative w-3 h-3 shrink-0">
                                        <Image
                                            src={team.logo_url}
                                            alt={team.name}
                                            fill
                                            className="object-contain mix-blend-multiply dark:mix-blend-screen"
                                            sizes="16px"
                                        />
                                    </div>
                                )}
                                <p
                                    className="text-[10px] font-semibold tracking-wide truncate"
                                    style={{color: team.brick_color ?? undefined}}
                                >
                                    {team.name}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Desktop: original 3-column layout */}
            <div className="hidden sm:flex h-64">
                {reversed ? teamBlock : avatarBlock}
                <div className="flex-1 flex flex-col items-center justify-center gap-1.5 px-5 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-yellow-500/80 font-semibold">
                        {award_name}
                    </p>
                    <p className="text-xl font-bold text-foreground leading-tight">
                        {players.display_name ?? players.username}
                    </p>
                    <p className="text-xs text-muted-foreground/70">@{players.username}</p>
                    {team && (
                        <p
                            className="text-[11px] font-semibold mt-1 tracking-wide"
                            style={{color: team.brick_color ?? undefined}}
                        >
                            {team.name}
                        </p>
                    )}
                </div>
                {reversed ? avatarBlock : teamBlock}
            </div>
        </div>
    );
}

function FirstTeamCard({
    award,
    seasonId,
}: {
    award: SeasonDetail["season_awards"][number];
    seasonId: string;
}) {
    const {award_name, full_avatar_url, players} = award;
    const team = getAwardTeam(award, seasonId);

    return (
        <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] uppercase tracking-wide text-amber-500 dark:text-yellow-400 font-semibold text-center line-clamp-2 min-h-[24px]">
                {award_name}
            </p>

            <div className="relative w-full aspect-[3/4] rounded-sm overflow-hidden bg-yellow-500/10 dark:bg-yellow-500/5 border border-yellow-500/10 dark:border-yellow-500/5">
                {full_avatar_url ? (
                    <Image
                        src={full_avatar_url}
                        alt={players.username ?? "Player"}
                        fill
                        className="object-cover object-top"
                        sizes="14vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                            {(players.username ?? "?")
                                .slice(0, 2)
                                .toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-0.5 w-full">
                <p className="text-xs font-semibold text-center leading-tight truncate w-full">
                    {players.display_name ?? players.username}
                </p>

                <p className="text-[10px] text-muted-foreground text-center break-all w-full">
                    @{players.username}
                </p>

                {team && (
                    <p
                        className="text-[10px] font-semibold mt-1 tracking-wide"
                        style={{color: team.brick_color ?? undefined}}
                    >
                        {team.name}
                    </p>
                )}
            </div>
        </div>
    );
}

function FirstTeamMobileCard({
    award,
    seasonId,
}: {
    award: SeasonDetail["season_awards"][number];
    seasonId: string;
}) {
    const {award_name, full_avatar_url, players} = award;
    const team = getAwardTeam(award, seasonId);

    return (
        <div className="flex overflow-hidden rounded-sm border border-yellow-500/20 bg-yellow-500/5 h-28">
            {/* Content + logo — left */}
            <div className="flex-1 min-w-0 flex flex-col justify-between p-4">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-amber-500 font-semibold truncate">
                        {award_name}
                    </p>
                    <p className="text-sm font-bold leading-tight line-clamp-1">
                        {players.display_name ?? players.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 break-all">
                        @{players.username}
                    </p>
                </div>
                {team && (
                    <div className="flex items-center gap-1.5">
                        {team.logo_url && (
                            <div className="relative w-4 h-4 shrink-0">
                                <Image
                                    src={team.logo_url}
                                    alt={team.name}
                                    fill
                                    className="object-contain mix-blend-multiply dark:mix-blend-screen"
                                    sizes="16px"
                                />
                            </div>
                        )}
                        <p
                            className="text-[10px] font-semibold tracking-wide truncate"
                            style={{color: team.brick_color ?? undefined}}
                        >
                            {team.name}
                        </p>
                    </div>
                )}
            </div>
            {/* Avatar — right */}
            <div className="relative w-20 shrink-0 overflow-hidden">
                {full_avatar_url ? (
                    <Image
                        src={full_avatar_url}
                        alt={players.username ?? "Player"}
                        fill
                        className="object-cover object-top"
                        sizes="80px"
                    />
                ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                            {(players.username ?? "?").slice(0, 2).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function FirstTeamSection({awards, seasonId}: {awards: SeasonDetail["season_awards"]; seasonId: string}) {
    if (awards.length === 0) return null;
    const slots = Array.from({length: 7}, (_, i) => awards[i] ?? null);

    return (
        <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Award className="h-3 w-3" /> First Team
            </p>

            <div className="rounded-sm border border-yellow-500/25 bg-yellow-500/[0.03] p-4">
                {/* Desktop: 7-col grid */}
                <div className="hidden sm:grid grid-cols-7 gap-4">
                    {slots.map((award, i) =>
                        award
                            ? <FirstTeamCard key={award.id} award={award} seasonId={seasonId} />
                            : <div key={i} className="aspect-[3/4] rounded-sm bg-muted/20" />
                    )}
                </div>

                {/* Mobile: uniform horizontal cards */}
                <div className="sm:hidden space-y-2">
                    {slots.map((award, i) =>
                        award
                            ? <FirstTeamMobileCard key={award.id} award={award} seasonId={seasonId} />
                            : <div key={i} className="h-28 rounded-sm bg-muted/20" />
                    )}
                </div>
            </div>
        </div>
    );
}

function StaffTeamCard({
    award,
}: {
    award: SeasonDetail["season_awards"][number];
}) {
    const {full_avatar_url, players} = award;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-full aspect-[3/4] rounded-sm overflow-hidden bg-yellow-500/10 dark:bg-yellow-500/5 border border-yellow-500/10 dark:border-yellow-500/5">
                {full_avatar_url ? (
                    <Image
                        src={full_avatar_url}
                        alt={players.username ?? "Player"}
                        fill
                        className="object-cover object-top"
                        sizes="15vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                            {(players.username ?? "?")
                                .slice(0, 2)
                                .toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-0.5 w-full">
                <p className="text-xs font-semibold text-center leading-tight truncate w-full">
                    {players.display_name ?? players.username}
                </p>

                <p className="text-[10px] text-muted-foreground text-center break-all w-full">
                    @{players.username}
                </p>
            </div>
        </div>
    );
}

function StaffTeamSection({awards}: {awards: SeasonDetail["season_awards"]}) {
    if (awards.length === 0) return null;

    return (
        <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Award className="h-3 w-3" /> Staff Team
            </p>

            <div
                className="
                    rounded-sm border border-yellow-500/25 bg-yellow-500/[0.03] p-4
                    grid gap-4
                    [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]
                "
            >
                {awards.map((award) => (
                    <StaffTeamCard
                        key={award.id}
                        award={award}
                    />
                ))}
            </div>
        </div>
    );
}


// ─── Champion Roster ─────────────────────────────────────────────────────────

type RosterEntry = SeasonDetail["season_awards"][number];

function ChampionRosterCard({award}: {award: RosterEntry}) {
    const {award_name, full_avatar_url, players} = award;
    const username = players.username;
    const display_name = players.display_name;
    const roleLabel = ROSTER_ROLE_LABEL[award_name];
    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="relative w-full aspect-[3/4] rounded-sm overflow-hidden bg-muted/30">
                {full_avatar_url ? (
                    <Image
                        src={full_avatar_url}
                        alt={award_name}
                        fill
                        className="object-cover object-top"
                        sizes="10vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">
                            {username.slice(0, 2).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>
            <div className="flex flex-col items-center gap-0.5 w-full">
                <p className="text-xs font-semibold text-center leading-tight truncate w-full">
                    {display_name ?? username}
                </p>
                <p className="text-[10px] text-muted-foreground text-center break-all w-full">
                    @{username}
                </p>
                {roleLabel && (
                    <p className="text-[9px] uppercase tracking-wider text-yellow-500/80 font-bold text-center">
                        {roleLabel}
                    </p>
                )}
            </div>
        </div>
    );
}

function ChampionRosterMobileCard({award, index}: {award: RosterEntry; index: number}) {
    const {award_name, full_avatar_url, players} = award;
    const username = players.username;
    const display_name = players.display_name;
    const isRight = index % 2 === 1;

    const avatarEl = (
        <div className="relative w-[52%] shrink-0 self-stretch rounded-sm overflow-hidden bg-muted/30 min-h-[112px]">
            {full_avatar_url ? (
                <Image
                    src={full_avatar_url}
                    alt={award_name}
                    fill
                    className="object-cover object-top"
                    sizes="29vw"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">
                        {username.slice(0, 2).toUpperCase()}
                    </span>
                </div>
            )}
        </div>
    );

    const roleLabel = ROSTER_ROLE_LABEL[award_name];
    const textEl = (
        <div className={`flex-1 flex flex-col justify-center gap-0.5 min-w-0 px-2 ${isRight ? "items-start" : "items-end"}`}>
            <p className={`text-xs font-semibold leading-tight line-clamp-2 break-all ${isRight ? "text-left" : "text-right"}`}>
                {display_name ?? username}
            </p>
            <p className={`text-[10px] text-muted-foreground break-all w-full ${isRight ? "text-left" : "text-right"}`}>
                @{username}
            </p>
            {roleLabel && (
                <p className={`text-[9px] uppercase tracking-wider text-yellow-500/80 font-bold w-full ${isRight ? "text-left" : "text-right"}`}>
                    {roleLabel}
                </p>
            )}
        </div>
    );

    return (
        <div className="flex items-stretch min-h-[112px]">
            {isRight ? avatarEl : textEl}
            {isRight ? textEl : avatarEl}
        </div>
    );
}

const ROSTER_ROLE_RANK: Record<string, number> = {captain: 0, vice_captain: 1, court_captain: 2};
const ROSTER_ROLE_LABEL: Record<string, string> = {captain: "C", vice_captain: "VC", court_captain: "CC"};

function ChampionRosterSection({awards}: {awards: SeasonDetail["season_awards"]}) {
    if (awards.length === 0) return null;
    const sorted = [...awards].sort(
        (a, b) => (ROSTER_ROLE_RANK[a.award_name] ?? 3) - (ROSTER_ROLE_RANK[b.award_name] ?? 3)
    );
    const cols = Math.ceil(sorted.length / 2);
    return (
        <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Champion Roster
            </p>
            <div className="rounded-sm border border-border bg-muted/20 p-4">
                {/* Desktop: equal two-row grid */}
                <div
                    className="hidden sm:grid gap-3"
                    style={{gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`}}
                >
                    {sorted.map(a => (
                        <ChampionRosterCard key={a.id} award={a} />
                    ))}
                </div>
                {/* Mobile: mirrored 2-col — avatars meet in center, names frame outside */}
                <div className="sm:hidden grid grid-cols-2 gap-2">
                    {sorted.map((a, i) => (
                        <ChampionRosterMobileCard key={a.id} award={a} index={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SeasonDetailPage({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;

    const [seasonResult, regionsResult] = await Promise.all([
        getSeasonDetailAction(slug),
        getAllRegionsAction(),
    ]);

    if (!seasonResult.ok) {
        if (seasonResult.error.code === "NOT_FOUND") notFound();
        throw new Error(seasonResult.error.message);
    }

    const season = seasonResult.value;
    const regions = regionsResult.ok ? regionsResult.value : [];

    const championRoster = season.season_awards.filter(a => a.category === "champion_roster");

    const regionName = regions.find(r => r.id === season.region_id)?.name ?? "Unknown";

    const fmt = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("en-US", {month: "short", year: "numeric"}) : "?";

    const individualAwards = season.season_awards.filter(a => a.category === "individual_winners");
    const firstTeamAwards = season.season_awards.filter(a => a.category === "first_team");
    const staffTeamAwards = season.season_awards.filter(a => a.category === "staff_team");
    const hasPodium = season.season_podium.length > 0;
    const hasContent = hasPodium || championRoster.length > 0 || individualAwards.length > 0 || firstTeamAwards.length > 0;

    return (
        <div className="page-narrow space-y-6 py-6">
            <Link
                href="/archive"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeft className="h-3.5 w-3.5" />
                League History
            </Link>

            <div>
                <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {season.name}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                    {regionName} · {fmt(season.start_date)}{season.end_date ? ` – ${fmt(season.end_date)}` : ""}
                </p>
            </div>

            {hasPodium && <PodiumSection entries={season.season_podium} />}

            {championRoster.length > 0 && <ChampionRosterSection awards={championRoster} />}

            {individualAwards.length > 0 && (
                <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Award className="h-3 w-3" /> Individual Awards
                    </p>
                    <div className="flex flex-col gap-2">
                        {individualAwards.map((award, i) => (
                            <IndividualAwardCard
                                key={award.id}
                                award={award}
                                index={i}
                                seasonId={season.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {firstTeamAwards.length > 0 && <FirstTeamSection awards={firstTeamAwards} seasonId={season.id}/>}
            {staffTeamAwards.length > 0 && <StaffTeamSection awards={staffTeamAwards}/>}

            {!hasContent && (
                <div className="panel p-6 text-center">
                    <p className="text-muted-foreground text-sm">Results not yet recorded.</p>
                </div>
            )}
        </div>
    );
}
