import Link from "next/link";
import Image from "next/image";
import {cn} from "@/lib/utils";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/app/components/ui/tooltip";
import {LEADER_ORDER, LEADER_SHORT} from "../model/leaders";
import {SectionHeading} from "./SectionHeading";
import {TeamMark, TodayMark} from "./TeamMark";
import type {HomeView, LeaderCategory, LeaderCell, ResultDay, ResultRow} from "../model/types";

const LEADER_NOUN: Record<LeaderCategory, string> = {
    points: "points",
    assists: "assists",
    blocks: "blocks",
    receives: "receives",
};

const DAY_LABEL = "text-xs font-medium uppercase tracking-wide text-muted-foreground";

function homeWonOf(row: ResultRow): boolean | null {
    if (row.homeSets == null || row.awaySets == null || row.homeSets === row.awaySets) return null;
    return row.homeSets > row.awaySets;
}

function scoreOf(row: ResultRow): string {
    return `${row.homeSets ?? "-"}-${row.awaySets ?? "-"}`;
}

function DayLabel({day}: {day: ResultDay}) {
    return <>{day.isToday ? <TodayMark>{day.label}</TodayMark> : day.label}</>;
}

function TeamName({team, won}: {team: ResultRow["home"]; won: boolean | null}) {
    return <span className={cn("truncate text-sm", won === true && "font-bold", won === false && "text-muted-foreground")}>{team.name}</span>;
}

function Leader({cell, category}: {cell: LeaderCell; category: LeaderCategory}) {
    const label = `${cell.name}, ${cell.value} ${LEADER_NOUN[category]}`;
    const body = (
        <>
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden">
                {cell.avatarUrl ? (
                    <Image src={cell.avatarUrl} alt="" fill sizes="28px" className="object-cover" />
                ) : (
                    <span className="text-xs font-semibold text-muted-foreground">{cell.name.slice(0, 1).toUpperCase()}</span>
                )}
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums">{cell.value}</span>
        </>
    );
    const cls = "inline-flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {cell.href ? (
                    <Link href={cell.href} aria-label={label} className={cn(cls, "hover:underline hover:underline-offset-4")}>
                        {body}
                    </Link>
                ) : (
                    <span tabIndex={0} aria-label={label} className={cls}>
                        {body}
                    </span>
                )}
            </TooltipTrigger>
            <TooltipContent className="text-xs">{cell.name}</TooltipContent>
        </Tooltip>
    );
}

function ScoreList({days, withRound}: {days: ResultDay[]; withRound: boolean}) {
    const grid = cn(
        "grid items-center gap-x-2 px-2 py-2",
        withRound
            ? "grid-cols-[36px_minmax(0,1fr)_48px_minmax(0,1fr)] sm:grid-cols-[40px_minmax(0,1fr)_56px_minmax(0,1fr)]"
            : "grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)]",
    );
    return (
        <div className="mt-2">
            {days.map(day => (
                <div key={day.key} className="mt-3 first:mt-1">
                    <h3 className={cn(DAY_LABEL, "px-2 pb-1")}>
                        <DayLabel day={day} />
                    </h3>
                    <ul>
                        {day.rows.map(row => {
                            const homeWon = homeWonOf(row);
                            const body = (
                                <>
                                    {withRound && <span className="truncate font-mono text-[10px] uppercase text-muted-foreground">{row.roundCode ?? ""}</span>}
                                    <span className="flex min-w-0 items-center justify-end gap-2">
                                        <TeamName team={row.home} won={homeWon} />
                                        <TeamMark team={row.home} size={24} />
                                    </span>
                                    <span className="text-center font-mono text-base font-semibold tabular-nums">{scoreOf(row)}</span>
                                    <span className="flex min-w-0 items-center gap-2">
                                        <TeamMark team={row.away} size={24} />
                                        <TeamName team={row.away} won={homeWon === null ? null : !homeWon} />
                                    </span>
                                </>
                            );
                            return (
                                <li key={row.matchId}>
                                    {row.href ? (
                                        <Link
                                            href={row.href}
                                            className={cn(grid, "hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground")}
                                        >
                                            {body}
                                        </Link>
                                    ) : (
                                        <div className={grid}>{body}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </div>
    );
}

function LeaderTable({days, withRound}: {days: ResultDay[]; withRound: boolean}) {
    const head = "pb-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
    const columns = (withRound ? 1 : 0) + 3 + LEADER_ORDER.length;
    return (
        <table className="mt-2 hidden w-full table-fixed border-collapse sm:table">
                <thead>
                    <tr className="border-b border-border">
                        {withRound && (
                            <th scope="col" className={cn(head, "w-12 px-2")}>
                                <abbr title="Round" className="no-underline">Rd</abbr>
                            </th>
                        )}
                        <th scope="col" className={cn(head, "w-[200px] pr-3", !withRound && "pl-2")}>Home</th>
                        <th scope="col" className={cn(head, "w-16 pr-3")}>Score</th>
                        <th scope="col" className={cn(head, "w-[200px] pr-3")}>Away</th>
                        {LEADER_ORDER.map(c => (
                            <th key={c} scope="col" className={cn(head, "pr-2")}>{LEADER_SHORT[c]}</th>
                        ))}
                    </tr>
                </thead>
                {days.map(day => (
                    <tbody key={day.key}>
                        <tr>
                            <th scope="rowgroup" colSpan={columns} className={cn(DAY_LABEL, "px-2 pb-1 pt-4 text-left")}>
                                <DayLabel day={day} />
                            </th>
                        </tr>
                        {day.rows.map(row => {
                            const homeWon = homeWonOf(row);
                            const byCategory = new Map(row.leaders.map(l => [l.category, l.cell]));
                            const score = scoreOf(row);
                            return (
                                <tr key={row.matchId} className="hover:bg-muted/40">
                                    {withRound && (
                                        <td className="truncate px-2 py-2 font-mono text-[10px] uppercase text-muted-foreground">{row.roundCode ?? ""}</td>
                                    )}
                                    <td className={cn("py-2 pr-3", !withRound && "pl-2")}>
                                        <span className="flex min-w-0 items-center gap-2">
                                            <TeamMark team={row.home} size={24} />
                                            <TeamName team={row.home} won={homeWon} />
                                        </span>
                                    </td>
                                    <td className="py-2 pr-3">
                                        {row.href ? (
                                            <Link
                                                href={row.href}
                                                aria-label={`${row.home.name} ${score} ${row.away.name}, match page`}
                                                className="font-mono text-base font-semibold tabular-nums underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                                            >
                                                {score}
                                            </Link>
                                        ) : (
                                            <span className="font-mono text-base font-semibold tabular-nums">{score}</span>
                                        )}
                                    </td>
                                    <td className="py-2 pr-3">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <TeamMark team={row.away} size={24} />
                                            <TeamName team={row.away} won={homeWon === null ? null : !homeWon} />
                                        </span>
                                    </td>
                                    {LEADER_ORDER.map(c => {
                                        const cell = byCategory.get(c);
                                        return (
                                            <td key={c} className="py-2 pr-2">
                                                {cell && <Leader cell={cell} category={c} />}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                ))}
            </table>
    );
}

export function ResultsSection({title, days, href}: HomeView["results"]) {
    if (days.length === 0) return null;
    const rows = days.flatMap(d => d.rows);
    const withRound = rows.some(r => r.roundCode);
    const hasLeaders = rows.some(r => r.leaders.length > 0);
    return (
        <section aria-label={title}>
            <SectionHeading title={title} href={href} linkLabel="All results" />
            <TooltipProvider>
                {hasLeaders ? (
                    <>
                        <div className="sm:hidden">
                            <ScoreList days={days} withRound={withRound} />
                        </div>
                        <LeaderTable days={days} withRound={withRound} />
                    </>
                ) : (
                    <ScoreList days={days} withRound={withRound} />
                )}
            </TooltipProvider>
        </section>
    );
}
