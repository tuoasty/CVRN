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
        <div className={cn("flex min-w-0 items-center gap-3 py-1.5", home && "flex-row-reverse text-right")}>
            <PlayerAvatar src={player.avatarUrl} size={40} />
            <div className="min-w-0">
                {player.href ? <Link href={player.href} prefetch={false} className="block hover:underline">{name}</Link> : name}
                {line.length > 0 && (
                    <div className={cn("mt-0.5 flex gap-x-3", home && "justify-end")}>
                        {line.map(s => (
                            <div key={s.label} className="leading-tight">
                                <div className="font-mono text-[13px] font-semibold tabular-nums">{s.value}</div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
            <div className="grid grid-cols-2 gap-x-8">
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
                        <div className="mt-1 grid grid-cols-2 gap-x-8">
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
