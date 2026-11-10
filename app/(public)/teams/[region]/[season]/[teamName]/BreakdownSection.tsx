"use client";

import { useState } from "react";
import { ViewTabs } from "@/app/components/filters/ViewTabs";
import { ordinal } from "@/app/features/teams/model/strength";
import type { BreakdownGroup, BreakdownStat, TeamBreakdown } from "@/app/features/teams/detail/model/breakdown";

type View = "projected" | "season";

type Props = {
    breakdown: TeamBreakdown | null;
};

const LEFT_GROUPS: BreakdownGroup[] = ["Overall", "Attack", "Setting"];
const RIGHT_GROUPS: BreakdownGroup[] = ["Block", "Defense", "Serve"];

function formatValue(stat: BreakdownStat): string {
    if (stat.value === null) return "-";
    if (stat.kind === "pct") return `${(stat.value * 100).toFixed(1)}%`;
    const text = stat.value.toFixed(1);
    if (Number(text) === 0) return "0.0";
    if (stat.kind === "diff" && stat.value > 0) return `+${text}`;
    return text;
}

function showsZero(stat: BreakdownStat): boolean {
    if (stat.value === null || stat.kind === "diff") return false;
    const scale = stat.kind === "pct" ? 1000 : 10;
    return Math.round(stat.value * scale) === 0;
}

function StatGroup({ group, stats }: { group: BreakdownGroup; stats: BreakdownStat[] }) {
    return (
        <div>
            {group !== "Overall" && (
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{group}</h3>
            )}
            <table className="w-full text-sm">
                <tbody>
                    {stats.map((stat) => (
                        <tr key={stat.key}>
                            <th scope="row" className="py-0.5 text-left font-normal text-foreground">
                                {stat.label}
                            </th>
                            <td className="py-0.5 text-right font-mono tabular-nums text-foreground">{formatValue(stat)}</td>
                            <td className="w-12 py-0.5 text-right font-mono tabular-nums text-muted-foreground">
                                {stat.rank !== null ? ordinal(stat.rank) : "-"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function StatGroups({ stats }: { stats: BreakdownStat[] }) {
    const visible = stats.filter((stat) => !showsZero(stat));
    const column = (groups: BreakdownGroup[]) =>
        groups
            .map((group) => ({ group, rows: visible.filter((stat) => stat.group === group) }))
            .filter(({ rows }) => rows.length > 0)
            .map(({ group, rows }) => <StatGroup key={group} group={group} stats={rows} />);

    return (
        <div className="mt-3 grid gap-x-10 gap-y-3 sm:max-[1099px]:grid-cols-2">
            <div className="space-y-3">{column(LEFT_GROUPS)}</div>
            <div className="space-y-3">{column(RIGHT_GROUPS)}</div>
        </div>
    );
}

export default function BreakdownSection({ breakdown }: Props) {
    const hasSeason = !!breakdown?.season;
    const [view, setView] = useState<View>(hasSeason ? "season" : "projected");
    const active: View = hasSeason ? view : "projected";

    const tabs = hasSeason
        ? ([
              { value: "projected", label: "Projected" },
              { value: "season", label: "This season" },
          ] as const)
        : ([{ value: "projected", label: "Projected" }] as const);

    return (
        <section aria-label="Team breakdown" className="min-w-0">
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-base font-semibold">Team breakdown</h2>
                <span className="text-xs text-muted-foreground">per set · rank in region</span>
            </div>
            <ViewTabs label="Breakdown view" idBase="team-breakdown" tabs={tabs} value={active} onChange={setView} density="compact" className="mt-1" />

            {!breakdown ? (
                <p className="py-6 text-sm text-muted-foreground">No breakdown for this team yet.</p>
            ) : active === "season" && breakdown.season ? (
                <div id="team-breakdown-panel" role="tabpanel" aria-labelledby="team-breakdown-tab-season">
                    <StatGroups stats={breakdown.season} />
                </div>
            ) : (
                <div id="team-breakdown-panel" role="tabpanel" aria-labelledby="team-breakdown-tab-projected">
                    <StatGroups stats={breakdown.projected} />
                </div>
            )}
        </section>
    );
}
