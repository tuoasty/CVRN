import Image from "next/image";
import { DefaultTeamLogo } from "@/app/components/ui/DefaultTeamLogo";
import Link from "next/link";
import AvatarImage from "@/app/components/ui/AvatarImage";
import BackButton from "@/app/components/public/BackButton";
import { buildPublicPlayerHref } from "@/app/utils/matchDetailHref";
import { cn } from "@/lib/utils";
import { getLogoClassName } from "@/app/lib/logoClass";
import { PlayerWithRole, PlayerLeaderboardRow, RosterSpec } from "@/server/domains/player";
import { TeamWithRegion, TeamNameHistoryEntry } from "@/server/domains/team";
import { MatchWithDetails } from "@/server/domains/match";
import { StandingMethod } from "@/shared/types/standing";
import { positionLabel } from "@/shared/volleyball/positions";
import TeamStatsSection from "./TeamStatsSection";
import TeamMatchHistory from "./TeamMatchHistory";

const LEADERSHIP_CONFIG = {
    captain:       { label: "Captain",       from: "#9e6bff", to: "#9fc1ff", textColor: "#ffffff" },
    vice_captain:  { label: "Vice Captain",  from: "#aea287", to: "#f1f7ff", textColor: "#2d2416" },
    court_captain: { label: "Court Captain", from: "#907575", to: "#ffcec6", textColor: "#ffffff" },
};

const TEXT_SHADOW = "0 1px 4px rgba(0,0,0,0.95)";

function RosterSpecLine({ spec, dark }: { spec: RosterSpec; dark: boolean }) {
    const empty = Math.max(0, spec.stars - spec.starsAwarded);
    return (
        <div className="mt-1 flex items-center justify-between gap-1.5">
            <span
                className={cn(
                    "text-[7px] font-semibold uppercase tracking-wide truncate min-w-0",
                    dark
                        ? spec.dropped ? "text-white/45" : "text-white/90"
                        : spec.dropped ? "text-muted-foreground/60" : "text-foreground/80"
                )}
                style={dark ? { textShadow: TEXT_SHADOW } : undefined}
                title={spec.name}
            >
                {spec.name}
            </span>
            <span
                className="font-mono text-[7px] leading-none shrink-0 whitespace-nowrap tabular-nums"
                style={dark ? { textShadow: TEXT_SHADOW } : undefined}
            >
                <span className="text-secondary">{"★".repeat(spec.starsAwarded)}</span>
                <span className={dark ? "text-white/30" : "text-muted-foreground/30"}>{"★".repeat(empty)}</span>
            </span>
        </div>
    );
}

function PublicLeadershipCard({
    role,
    player,
}: {
    role: "captain" | "vice_captain" | "court_captain";
    player: PlayerWithRole | null;
}) {
    const config = LEADERSHIP_CONFIG[role];
    return (
        <div
            className="rounded-md overflow-hidden"
            style={{ border: `1px solid ${config.from}40` }}
        >
            <div className="relative aspect-square w-full">
                {player ? (
                    <>
                        <AvatarImage
                            src={player.avatar_url}
                            alt={player.username || ""}
                            sizes="(max-width: 640px) 34vw, 160px"
                        />
                        <div
                            className="absolute top-1 left-1 text-[7px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-sm leading-none"
                            style={{
                                background: `linear-gradient(to right, ${config.from}, ${config.to})`,
                                color: config.textColor,
                                boxShadow: "0 0 0 1px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.35)",
                                textShadow: config.textColor === "#ffffff"
                                    ? "-1px -1px 0 rgba(0,0,0,0.5), 1px -1px 0 rgba(0,0,0,0.5), -1px 1px 0 rgba(0,0,0,0.5), 1px 1px 0 rgba(0,0,0,0.5)"
                                    : "0 1px 0 rgba(255,255,255,0.4)",
                            }}
                        >
                            {config.label}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-1.5 pt-6 pb-1.5">
                            <p className="text-white text-[10px] font-semibold truncate leading-tight" style={{ textShadow: TEXT_SHADOW }}>
                                {player.display_name || player.username}
                            </p>
                            <div className="flex items-baseline justify-between gap-1.5">
                                <p className="text-white/50 text-[8px] truncate min-w-0" style={{ textShadow: TEXT_SHADOW }}>
                                    @{player.username}
                                </p>
                                {player.current_position && (
                                    <span title={positionLabel(player.current_position)} className="shrink-0 text-white/70 text-[10px] font-extrabold uppercase tracking-wide leading-none" style={{ textShadow: TEXT_SHADOW }}>
                                        {player.current_position}
                                    </span>
                                )}
                            </div>
                            {player.spec && <RosterSpecLine spec={player.spec} dark />}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-muted/30 flex items-center justify-center">
                            <span className="text-2xl text-muted-foreground/20">?</span>
                        </div>
                        <div
                            className="absolute top-1 left-1 text-[7px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-sm leading-none"
                            style={{
                                background: `linear-gradient(to right, ${config.from}, ${config.to})`,
                                color: config.textColor,
                                boxShadow: "0 0 0 1px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.35)",
                                textShadow: config.textColor === "#ffffff"
                                    ? "-1px -1px 0 rgba(0,0,0,0.5), 1px -1px 0 rgba(0,0,0,0.5), -1px 1px 0 rgba(0,0,0,0.5), 1px 1px 0 rgba(0,0,0,0.5)"
                                    : "0 1px 0 rgba(255,255,255,0.4)",
                            }}
                        >
                            {config.label}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-1.5 pt-6 pb-1.5">
                            <p className="text-white/30 text-[10px] truncate">Vacant</p>
                        </div>
                    </>
                )}
            </div>
            <div className="h-[3px]" style={{ background: `linear-gradient(to right, ${config.from}, ${config.to})` }} />
        </div>
    );
}

function PublicPlayerCard({
    player,
    teamColor,
}: {
    player: PlayerWithRole;
    teamColor?: string | null;
}) {
    return (
        <div className="col-span-3 sm:col-span-1 rounded-md overflow-hidden border border-border hover:border-primary/50 transition-colors">
            {}
            <div
                className="flex items-center gap-3 px-3 py-2.5 sm:hidden"
                style={teamColor ? { borderLeft: `3px solid ${teamColor}` } : undefined}
            >
                <div className="relative w-10 h-10 rounded shrink-0 overflow-hidden">
                    <AvatarImage src={player.avatar_url} alt={player.username || ""} sizes="40px" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate leading-tight">{player.display_name || player.username}</p>
                    <p className="text-xs text-muted-foreground truncate">@{player.username}</p>
                    {player.spec && <RosterSpecLine spec={player.spec} dark={false} />}
                </div>
                {player.current_position && (
                    <span title={positionLabel(player.current_position)} className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{player.current_position}</span>
                )}
            </div>
            {}
            <div className="hidden sm:block">
                <div className="relative aspect-square w-full">
                    <AvatarImage
                        src={player.avatar_url}
                        alt={player.username || ""}
                        sizes="160px"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1.5 pt-6 pb-1.5">
                        <p className="text-white text-[10px] font-semibold truncate leading-tight" style={{ textShadow: TEXT_SHADOW }}>
                            {player.display_name || player.username}
                        </p>
                        <div className="flex items-baseline justify-between gap-1.5">
                            <p className="text-white/60 text-[8px] truncate min-w-0" style={{ textShadow: TEXT_SHADOW }}>
                                @{player.username}
                            </p>
                            {player.current_position && (
                                <span title={positionLabel(player.current_position)} className="shrink-0 text-white/70 text-[10px] font-extrabold uppercase tracking-wide leading-none" style={{ textShadow: TEXT_SHADOW }}>
                                    {player.current_position}
                                </span>
                            )}
                        </div>
                        {player.spec && <RosterSpecLine spec={player.spec} dark />}
                    </div>
                </div>
                {teamColor && <div className="h-[3px]" style={{ backgroundColor: teamColor }} />}
            </div>
        </div>
    );
}

function PublicOpenSlotCard({ index }: { index: number }) {
    return (
        <div className="hidden sm:flex sm:col-span-1 rounded-md border border-dashed border-border/40 aspect-square w-full items-center justify-center">
            <span className="text-[9px] text-muted-foreground/25">#{index}</span>
        </div>
    );
}

type Props = {
    team: TeamWithRegion;
    players: PlayerWithRole[];
    history: TeamNameHistoryEntry[];
    statRows: PlayerLeaderboardRow[];
    matches: MatchWithDetails[];
    matchTeams: Record<string, TeamWithRegion>;
    regionCode: string;
    seasonSlug: string;
    standingMethod: StandingMethod;
};

export default function PublicTeamDetailPage({
    team: teamData,
    players,
    history,
    statRows,
    matches,
    matchTeams,
    regionCode,
    seasonSlug,
    standingMethod,
}: Props) {
    const regionName = teamData.seasons?.regions?.name || "Unknown Region";
    const regionCodeDisplay = teamData.seasons?.regions?.code?.toUpperCase() || "??";
    const seasonName = teamData.seasons?.name || "Unknown Season";
    const teamColor = teamData.brick_color || null;

    const captain = players.find((p) => p.role === "captain") || null;
    const viceCaptain = players.find((p) => p.role === "vice_captain") || null;
    const courtCaptain = players.find((p) => p.role === "court_captain") || null;
    const otherPlayers = players.filter(
        (p) => p.role !== "captain" && p.role !== "vice_captain" && p.role !== "court_captain"
    );

    const mostRecentFormerName = history.find(h => h.oldName !== teamData.name)?.oldName ?? null;
    const maxPlayers = teamData.seasons?.max_players ?? 18;
    const openSlots = Math.max(0, (maxPlayers - 3) - otherPlayers.length);

    return (
        <div className="page-wide space-y-6 py-6">
            {}
            {}
            {}
            <div className="pt-2 pb-4">
                <div className="flex items-center gap-2 mb-4">
                    <BackButton />
                </div>
                <div className="flex items-center gap-5">
                    {teamData && (
                        <div className="relative w-36 h-36 sm:w-44 sm:h-44 shrink-0">
                            {teamData.logo_url ? (
                                <Image
                                    src={teamData.logo_url}
                                    alt={teamData.name || ""}
                                    fill
                                    priority
                                    sizes="(max-width: 640px) 144px, 176px"
                                    className={getLogoClassName(teamData.logo_bg_removed)}
                                />
                            ) : (
                                <DefaultTeamLogo sizes="(max-width: 640px) 144px, 176px" alt={teamData.name || ""} />
                            )}
                        </div>
                    )}
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">{teamData.name}</h1>
                        <p className={cn("text-xs text-muted-foreground mt-1 truncate", !mostRecentFormerName && "invisible")}>
                            Formerly: {mostRecentFormerName}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-mono font-semibold">{regionCodeDisplay}</span>
                            {" — "}{regionName}{" / "}{seasonName}
                        </p>
                        {(teamData.brick_number != null || teamData.brick_color) && (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                {teamData.brick_color && (
                                    <span
                                        className="inline-block w-3 h-3 rounded-sm border border-border shrink-0"
                                        style={{ backgroundColor: teamData.brick_color }}
                                    />
                                )}
                                {teamData.brick_number != null && (
                                    <>
                                        <span className="text-muted-foreground/40">·</span>
                                        <span className="font-mono font-semibold">{teamData.brick_number}</span>
                                    </>
                                )}
                                {teamData.brick_color && (
                                    <>
                                        <span className="text-muted-foreground/40">·</span>
                                        <span className="font-mono">{teamData.brick_color.toUpperCase()}</span>
                                    </>
                                )}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm uppercase tracking-wide text-muted-foreground">Roster</h3>
                    <span className="text-sm text-muted-foreground">{players.length} / {maxPlayers}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 sm:gap-3">
                    {captain?.username ? (
                        <Link href={buildPublicPlayerHref(captain.username) ?? "#"} prefetch={false}>
                            <PublicLeadershipCard role="captain" player={captain} />
                        </Link>
                    ) : (
                        <PublicLeadershipCard role="captain" player={captain} />
                    )}
                    {viceCaptain?.username ? (
                        <Link href={buildPublicPlayerHref(viceCaptain.username) ?? "#"} prefetch={false}>
                            <PublicLeadershipCard role="vice_captain" player={viceCaptain} />
                        </Link>
                    ) : (
                        <PublicLeadershipCard role="vice_captain" player={viceCaptain} />
                    )}
                    {courtCaptain?.username ? (
                        <Link href={buildPublicPlayerHref(courtCaptain.username) ?? "#"} prefetch={false}>
                            <PublicLeadershipCard role="court_captain" player={courtCaptain} />
                        </Link>
                    ) : (
                        <PublicLeadershipCard role="court_captain" player={courtCaptain} />
                    )}
                    {otherPlayers.map((player) => (
                        player.username ? (
                            <Link key={player.id} href={buildPublicPlayerHref(player.username) ?? "#"} prefetch={false} className="col-span-3 sm:col-span-1 block">
                                <PublicPlayerCard
                                    player={player}
                                    teamColor={teamColor}
                                />
                            </Link>
                        ) : (
                            <PublicPlayerCard
                                key={player.id}
                                player={player}
                                teamColor={teamColor}
                            />
                        )
                    ))}
                    {Array.from({ length: openSlots }).map((_, i) => (
                        <PublicOpenSlotCard
                            key={`slot-${i}`}
                            index={otherPlayers.length + i + 4}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-sm uppercase tracking-wide text-muted-foreground">Season Stats</h3>
                <TeamStatsSection rows={statRows} />
            </div>

            <TeamMatchHistory
                matches={matches}
                teams={matchTeams}
                teamId={teamData.id}
                regionCode={regionCode}
                seasonSlug={seasonSlug}
                standingMethod={standingMethod}
            />
        </div>
    );
}
