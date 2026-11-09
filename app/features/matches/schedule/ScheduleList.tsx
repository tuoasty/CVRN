import type {ReactNode} from "react";
import {TodayMark} from "@/app/(public)/home/sections/TeamMark";
import {ScheduleRowView} from "./ScheduleRowView";
import type {ScheduleDay, ScheduleKind, ScheduleRow, ScheduleView} from "./types";

type Props = {
    view: ScheduleView;
    kind: ScheduleKind;
    hrefFor: (row: ScheduleRow) => string | null;
    renderActions?: (row: ScheduleRow) => ReactNode;
};

function Day({day, kind, hrefFor, renderActions}: {day: ScheduleDay} & Omit<Props, "view">) {
    const count = day.rows.length;
    return (
        <section className="mt-5 first:mt-3">
            <h3 className="flex items-center gap-2 border-b border-border px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {day.isToday ? <TodayMark>Today · {day.label}</TodayMark> : day.label}
                <span className="ml-auto font-mono font-normal normal-case tracking-normal tabular-nums">
                    {count} {count === 1 ? "match" : "matches"}
                </span>
            </h3>
            <ul>
                {day.rows.map(row => (
                    <li key={row.matchId}>
                        <ScheduleRowView
                            row={row}
                            kind={kind}
                            isToday={day.isToday}
                            href={hrefFor(row)}
                            actions={renderActions?.(row)}
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}

function Block({title, days, ...rest}: {title: string; days: ScheduleDay[]} & Omit<Props, "view">) {
    if (days.length === 0) return null;
    return (
        <div className="mt-8 first:mt-6">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {days.map(day => (
                <Day key={day.key} day={day} {...rest} />
            ))}
        </div>
    );
}

export function ScheduleList({view, ...rest}: Props) {
    if (view.upcoming.length === 0 && view.results.length === 0) {
        return <p className="mt-6 text-sm text-muted-foreground">No matches yet</p>;
    }
    return (
        <div>
            <Block title="Upcoming" days={view.upcoming} {...rest} />
            <Block title="Results" days={view.results} {...rest} />
        </div>
    );
}
