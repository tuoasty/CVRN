import Link from "next/link";
import type {ReactNode} from "react";
import {cn} from "@/lib/utils";
import {TeamMark} from "@/app/(public)/home/sections/TeamMark";
import {TodayText} from "@/app/components/ui/TodayText";
import type {ScheduleKind, ScheduleRow, ScheduleTeam} from "./types";

export const ROW_GRID = "grid-cols-[64px_128px_minmax(0,1fr)_72px_minmax(0,1fr)_216px_64px]";
export const ROW_GRID_ADMIN = "grid-cols-[64px_128px_minmax(0,1fr)_72px_minmax(0,1fr)_216px_64px_196px]";

function ForfeitBadge() {
    return <span className="inline-flex items-center rounded-full border border-border px-2 text-xs font-medium text-muted-foreground">Forfeit</span>;
}

function TeamName({team, completed}: {team: ScheduleTeam; completed: boolean}) {
    return (
        <span
            className={cn(
                "truncate text-sm group-hover/row:underline group-hover/row:underline-offset-4",
                completed && !team.won ? "font-medium text-muted-foreground" : "font-semibold text-foreground",
            )}
        >
            {team.name}
        </span>
    );
}

function Tag({team}: {team: ScheduleTeam}) {
    if (!team.tag) return null;
    return <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{team.tag}</span>;
}

function SetPoints({row}: {row: ScheduleRow}) {
    if (row.isForfeit) return <ForfeitBadge />;
    return (
        <span className="flex justify-end gap-2.5 font-mono text-xs tabular-nums text-muted-foreground">
            {row.sets.map((s, i) => (
                <span key={i}>
                    <span className={cn(s.home > s.away && "font-medium text-foreground")}>{s.home}</span>
                    -
                    <span className={cn(s.away > s.home && "font-medium text-foreground")}>{s.away}</span>
                </span>
            ))}
        </span>
    );
}

function Middle({row}: {row: ScheduleRow}) {
    if (!row.isCompleted) return <span className="text-center text-xs text-muted-foreground">vs</span>;
    return (
        <span className="text-center font-mono text-lg font-semibold tabular-nums">
            <span className={cn(!row.home.won && "font-normal text-muted-foreground")}>{row.homeSets ?? 0}</span>
            <span className="text-muted-foreground">–</span>
            <span className={cn(!row.away.won && "font-normal text-muted-foreground")}>{row.awaySets ?? 0}</span>
        </span>
    );
}

function PhoneTeamLine({team, sets, side, completed, total}: {team: ScheduleTeam; sets: ScheduleRow["sets"]; side: "home" | "away"; completed: boolean; total: number | null}) {
    const won = (s: ScheduleRow["sets"][number]) => (side === "home" ? s.home > s.away : s.away > s.home);
    const mine = (s: ScheduleRow["sets"][number]) => (side === "home" ? s.home : s.away);
    return (
        <div className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2.5 py-0.5">
            <TeamMark team={{...team, href: null}} size={24} />
            <span className="flex min-w-0 items-baseline gap-2">
                <TeamName team={team} completed={completed} />
                <Tag team={team} />
            </span>
            <span className="flex items-center gap-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                {sets.map((s, i) => (
                    <span key={i} className={cn(won(s) && "font-medium text-foreground")}>{mine(s)}</span>
                ))}
                {completed && (
                    <span className={cn("w-3 text-right text-base font-semibold", team.won ? "text-foreground" : "font-normal text-muted-foreground")}>
                        {total ?? 0}
                    </span>
                )}
            </span>
        </div>
    );
}

export function ScheduleRowView({
    row,
    href,
    isToday,
    kind,
    actions,
}: {
    row: ScheduleRow;
    href: string | null;
    isToday: boolean;
    kind: ScheduleKind;
    actions?: ReactNode;
}) {
    const time = <TodayText active={isToday}>{row.time ?? "TBD"}</TodayText>;
    const setsShown = row.isForfeit ? [] : row.sets;
    return (
        <div className="group/row relative transition-colors duration-150 hover:bg-muted/30 motion-reduce:transition-none">
            {href && (
                <Link
                    href={href}
                    aria-label={`${row.home.name} vs ${row.away.name}, ${row.label}`}
                    className="absolute inset-0 z-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
                />
            )}
            <div className={cn("pointer-events-none hidden items-center gap-3 px-2 py-3 sm:grid", actions ? ROW_GRID_ADMIN : ROW_GRID)}>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{time}</span>
                <span className="truncate text-xs text-muted-foreground">{row.label}</span>
                <span className="flex min-w-0 items-center justify-end gap-2.5 text-right">
                    <Tag team={row.home} />
                    <TeamName team={row.home} completed={row.isCompleted} />
                    <TeamMark team={{...row.home, href: null}} size={32} />
                </span>
                <Middle row={row} />
                <span className="flex min-w-0 items-center gap-2.5">
                    <TeamMark team={{...row.away, href: null}} size={32} />
                    <TeamName team={row.away} completed={row.isCompleted} />
                    <Tag team={row.away} />
                </span>
                <span className="flex justify-end">{row.isCompleted && <SetPoints row={row} />}</span>
                <span className="text-right font-mono text-xs tabular-nums">{kind === "season" ? row.impact ?? "" : ""}</span>
                {actions && <span className="pointer-events-auto relative z-10 flex justify-end">{actions}</span>}
            </div>
            <div className="pointer-events-none px-2 py-3 sm:hidden">
                <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono tabular-nums">{time}</span>
                    <span className="truncate">{row.label}</span>
                    {row.isForfeit && <ForfeitBadge />}
                    {row.impact && <span className="ml-auto font-mono tabular-nums text-foreground">{row.impact}</span>}
                </div>
                <PhoneTeamLine team={row.home} sets={setsShown} side="home" completed={row.isCompleted} total={row.homeSets} />
                <PhoneTeamLine team={row.away} sets={setsShown} side="away" completed={row.isCompleted} total={row.awaySets} />
                {actions && <div className="pointer-events-auto relative z-10 mt-2 flex">{actions}</div>}
            </div>
        </div>
    );
}
