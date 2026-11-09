import Link from "next/link";
import {cn} from "@/lib/utils";
import {SectionHeading} from "./SectionHeading";
import {TeamMark, TodayMark} from "./TeamMark";
import type {UpcomingDay, UpcomingRow} from "../model/types";

const GRID = "grid-cols-[44px_minmax(0,1fr)_24px_minmax(0,1fr)_28px]";
const GRID_ROUND = "grid-cols-[44px_36px_minmax(0,1fr)_24px_minmax(0,1fr)_28px]";

function Row({row, withRound}: {row: UpcomingRow; withRound: boolean}) {
    const body = (
        <>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{row.time ?? "TBD"}</span>
            {withRound && <span className="truncate font-mono text-[10px] uppercase text-muted-foreground">{row.roundCode ?? ""}</span>}
            <span className="flex min-w-0 items-center justify-end gap-2">
                <span className="truncate text-sm">{row.home.name}</span>
                <TeamMark team={row.home} size={24} />
            </span>
            <span className="text-center text-xs text-muted-foreground">vs</span>
            <span className="flex min-w-0 items-center gap-2">
                <TeamMark team={row.away} size={24} />
                <span className="truncate text-sm">{row.away.name}</span>
            </span>
            <span className="text-right font-mono text-[10px] text-muted-foreground">{row.hasGfx ? "GFX" : ""}</span>
        </>
    );
    const cls = cn("grid items-center gap-x-2 px-2 py-2", withRound ? GRID_ROUND : GRID);
    return row.href ? (
        <Link
            href={row.href}
            className={cn(cls, "hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground")}
        >
            {body}
        </Link>
    ) : (
        <div className={cls}>{body}</div>
    );
}

export function UpcomingSection({days}: {days: UpcomingDay[]}) {
    const withRound = days.some(d => d.rows.some(r => r.roundCode));
    return (
        <section aria-label="Upcoming">
            <SectionHeading title="Upcoming" />
            {days.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No matches scheduled</p>
            ) : (
                <div className="mt-2">
                    {days.map(day => (
                        <div key={day.key} className="mt-3 first:mt-1">
                            <h3 className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {day.isToday ? <TodayMark>{day.label}</TodayMark> : day.label}
                            </h3>
                            <ul>
                                {day.rows.map(row => (
                                    <li key={row.matchId}>
                                        <Row row={row} withRound={withRound} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
