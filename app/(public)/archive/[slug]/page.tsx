import {notFound} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {Trophy, Medal, Award, ChevronLeft} from "lucide-react";
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
            <div className="flex items-center gap-2 text-yellow-500">
                <Trophy className="h-4 w-4" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">Champion</span>
            </div>
            <TeamLogoSmall name={entry.teams.name} logoUrl={entry.teams.logo_url} size={56} />
            <p className="text-xl font-bold text-center">{entry.teams.name}</p>
        </div>
    );
}

function PlacementCard({entry}: {entry: SeasonDetail["season_podium"][number]}) {
    const place = entry.place as 2 | 3;
    const isSecond = place === 2;
    const label = isSecond ? "Runner-Up" : "3rd Place";
    const borderClass = isSecond ? "border-slate-400/20 bg-slate-400/5" : "border-amber-700/20 bg-amber-700/5";
    const accentClass = isSecond ? "text-slate-400" : "text-amber-700";

    return (
        <div className={`panel p-4 flex flex-col items-center gap-2 border ${borderClass}`}>
            <div className={`flex items-center gap-1.5 ${accentClass}`}>
                <Medal className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold">{label}</span>
            </div>
            <TeamLogoSmall name={entry.teams.name} logoUrl={entry.teams.logo_url} size={40} />
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
        <div className="w-[20%] shrink-0 relative overflow-hidden bg-muted/10">
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
        <div className="panel flex overflow-hidden h-64 bg-yellow-500/[0.03] border-yellow-500/25">
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

            <div className="relative w-full aspect-[3/4] rounded-sm overflow-hidden bg-neutral-900">
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

                <p className="text-[10px] text-muted-foreground text-center truncate w-full">
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

function FirstTeamSection({awards, seasonId}: {awards: SeasonDetail["season_awards"]; seasonId:string}) {
    if (awards.length === 0) return null;
    const slots = Array.from({length: 7}, (_, i) => awards[i] ?? null);
    return (
        <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Award className="h-3 w-3" /> First Team
            </p>
            <div className="rounded-sm border border-yellow-500/25 bg-yellow-500/[0.03] p-4 grid grid-cols-7 gap-4">
                {slots.map((award, i) =>
                    award
                        ? <FirstTeamCard key={award.id} award={award} seasonId={seasonId} />
                        : <div key={i} className="aspect-[3/4] rounded-sm bg-muted/20" />
                )}
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
    const regionName = regions.find(r => r.id === season.region_id)?.name ?? "Unknown";

    const fmt = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("en-US", {month: "short", year: "numeric"}) : "?";

    const individualAwards = season.season_awards.filter(a => a.category === "individual_winners");
    const firstTeamAwards = season.season_awards.filter(a => a.category === "first_team");
    const hasPodium = season.season_podium.length > 0;
    const hasContent = hasPodium || individualAwards.length > 0 || firstTeamAwards.length > 0;

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

            {!hasContent && (
                <div className="panel p-6 text-center">
                    <p className="text-muted-foreground text-sm">Results not yet recorded.</p>
                </div>
            )}
        </div>
    );
}
