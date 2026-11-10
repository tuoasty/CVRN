import Link from "next/link";
import {cn} from "@/lib/utils";
import {PlayerAvatar} from "@/app/(public)/home/sections/TeamMark";
import {PRE_MATCH_ORDER, type PreMatchPlayer, type PreMatchSection, type PreMatchSectionKey, type PreMatchTeam} from "./buildPreMatchTeam";

const ROLE_MARK: Record<string, string> = {captain: "C", vice_captain: "VC", court_captain: "CC"};
const KEY = "text-[11px] font-medium uppercase tracking-wider text-muted-foreground";
const SECTION_ORDER: PreMatchSectionKey[] = [...PRE_MATCH_ORDER, "none"];

function sectionKey(s: PreMatchSection): PreMatchSectionKey {
    return s.key;
}

function Player({player, side}: {player: PreMatchPlayer | undefined; side: "home" | "away"}) {
    if (!player) return <div />;
    const home = side === "home";
    const mark = ROLE_MARK[player.role];
    const line = player.line;
    const name = (
        <span className={cn("flex min-w-0 items-baseline gap-1.5", home && "flex-row-reverse")}>
            <span className="min-w-0 truncate text-sm font-semibold">{player.name}</span>
            {mark && <span className="shrink-0 text-xs text-muted-foreground">{mark}</span>}
        </span>
    );
    return (
        <div className={cn(
            "grid min-w-0 items-center gap-x-2 py-1.5 sm:gap-x-3",
            home ? "grid-cols-[minmax(0,1fr)_auto] text-right" : "grid-cols-[auto_minmax(0,1fr)]",
        )}>
            <div className={cn("row-start-1 sm:row-span-2", home ? "col-start-2" : "col-start-1")}>
                <PlayerAvatar src={player.avatarUrl} size={40} className="h-7 w-7 sm:h-10 sm:w-10" />
            </div>
            <div className={cn("row-start-1 min-w-0 self-center sm:self-end", home ? "col-start-1" : "col-start-2")}>
                {player.href ? <Link href={player.href} prefetch={false} className="block hover:underline">{name}</Link> : name}
            </div>
            {line.length > 0 && (
                <div className={cn(
                    "col-span-2 row-start-2 mt-1 grid grid-cols-3 gap-x-1.5 sm:col-span-1 sm:mt-0.5 sm:flex sm:gap-x-3 sm:self-start",
                    home ? "sm:col-start-1 sm:justify-end" : "sm:col-start-2",
                )}>
                    {line.map(s => (
                        <div key={s.label} className="min-w-0 leading-tight">
                            <div className="truncate font-mono text-xs font-semibold tabular-nums sm:text-[13px]">{s.value}</div>
                            <div className="truncate text-[10px] uppercase tracking-normal text-muted-foreground sm:tracking-wider">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PreMatchComparison({home, away, homeName, awayName}: {
    home: PreMatchTeam;
    away: PreMatchTeam;
    homeName: string;
    awayName: string;
}) {
    const all = [...home.sections, ...away.sections];
    const order = SECTION_ORDER.flatMap(key => {
        const section = all.find(s => sectionKey(s) === key);
        return section ? [{key, label: section.label}] : [];
    });
    const find = (team: PreMatchTeam, key: PreMatchSectionKey) => team.sections.find(s => sectionKey(s) === key)?.players ?? [];
    const source = (team: PreMatchTeam) => (team.source === "season" ? "Season stats" : "All time stats");

    return (
        <div className="mx-auto max-w-2xl">
            <div className="grid grid-cols-2 gap-x-4 sm:gap-x-8">
                <div className="min-w-0 text-right">
                    <div className="truncate text-sm font-semibold">{homeName}</div>
                    <div className={KEY}>{source(home)}</div>
                </div>
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{awayName}</div>
                    <div className={KEY}>{source(away)}</div>
                </div>
            </div>
            {order.map(({key, label}) => {
                const homePlayers = find(home, key);
                const awayPlayers = find(away, key);
                const rows = Math.max(homePlayers.length, awayPlayers.length);
                return (
                    <section key={key} className="mt-6">
                        <h3 className={cn(KEY, "border-b border-border pb-1.5 text-center")}>{label}</h3>
                        <div className="mt-1 grid grid-cols-2 gap-x-4 sm:gap-x-8">
                            {Array.from({length: rows}, (_, i) => (
                                <div key={i} className="contents">
                                    <Player player={homePlayers[i]} side="home" />
                                    <Player player={awayPlayers[i]} side="away" />
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
