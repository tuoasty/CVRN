"use client";

import { useState } from "react";
import Link from "next/link";
import { ViewTabs } from "@/app/components/filters/ViewTabs";
import { ordinal } from "@/app/features/teams/model/strength";
import type { BreakdownStat, TeamBreakdown } from "@/app/features/teams/detail/model/breakdown";
import type { StarterSlot } from "@/app/features/teams/detail/model/projectedStarters";
import type { LeaderPlayer } from "./LeadersSection";

type View = "projected" | "season";

type Props = {
    breakdown: TeamBreakdown | null;
    players: Record<string, LeaderPlayer>;
};

const SIGNED = new Set(["pointDiff", "setDiff"]);

function formatValue(stat: BreakdownStat): string {
    if (stat.value === null) return "-";
    if (stat.key === "setDiff") return stat.value > 0 ? `+${stat.value}` : String(stat.value);
    const text = stat.value.toFixed(1);
    if (SIGNED.has(stat.key) && Number(text) > 0) return `+${text}`;
    if (Number(text) === 0) return "0.0";
    return text;
}

function showsZero(stat: BreakdownStat): boolean {
    return stat.value !== null && Math.round(stat.value * 10) === 0;
}

function StatTable({ stats }: { stats: BreakdownStat[] }) {
    return (
        <table className="mt-3 w-full text-sm">
            <thead>
                <tr className="border-b border-border">
                    <th scope="col" className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                        Stat per set
                    </th>
                    <th scope="col" className="pb-2 text-right text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                        Value
                    </th>
                    <th scope="col" className="w-16 pb-2 text-right text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                        Rank
                    </th>
                </tr>
            </thead>
            <tbody>
                {stats.map((stat) => (
                    <tr key={stat.key}>
                        <th scope="row" className="py-2 text-left font-normal text-foreground">
                            {stat.label}
                        </th>
                        <td className="py-2 text-right font-mono tabular-nums text-foreground">{formatValue(stat)}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">
                            {stat.rank !== null ? ordinal(stat.rank) : "-"}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function StartersList({ starters, players }: { starters: StarterSlot[]; players: Record<string, LeaderPlayer> }) {
    return (
        <>
            <h3 className="mt-6 text-sm font-semibold text-foreground">Projected starters</h3>
            <ul className="mt-2">
                {starters.map((slot, i) => {
                    const player = slot.playerId ? players[slot.playerId] : undefined;
                    return (
                        <li key={`${slot.slot}-${i}`} className="grid grid-cols-[44px_minmax(0,1fr)] items-center py-1.5 text-sm">
                            <span className="font-mono text-xs font-semibold text-muted-foreground">{slot.slot}</span>
                            {!player ? (
                                <span className="text-muted-foreground">-</span>
                            ) : (
                                <span className="flex min-w-0 items-baseline gap-2">
                                    {player.href ? (
                                        <Link
                                            href={player.href}
                                            prefetch={false}
                                            className="truncate font-semibold text-foreground hover:underline hover:underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                                        >
                                            {player.name}
                                        </Link>
                                    ) : (
                                        <span className="truncate font-semibold text-foreground">{player.name}</span>
                                    )}
                                    {player.username && (
                                        <span className="shrink-0 truncate text-xs text-muted-foreground">@{player.username}</span>
                                    )}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </>
    );
}

export default function BreakdownSection({ breakdown, players }: Props) {
    const hasSeason = !!breakdown?.season;
    const [view, setView] = useState<View>(hasSeason ? "season" : "projected");
    const active: View = hasSeason ? view : "projected";

    const tabs = hasSeason
        ? ([
              { value: "projected", label: "Projected" },
              { value: "season", label: "This season" },
          ] as const)
        : ([{ value: "projected", label: "Projected" }] as const);

    const fullLineup = !!breakdown && breakdown.starters.every((slot) => slot.playerId !== null);

    return (
        <section aria-label="Team breakdown" className="min-w-0">
            <h2 className="text-base font-semibold">Team breakdown</h2>
            <ViewTabs label="Breakdown view" idBase="team-breakdown" tabs={tabs} value={active} onChange={setView} density="compact" className="mt-1" />

            {!breakdown ? (
                <p className="py-6 text-sm text-muted-foreground">No breakdown for this team yet.</p>
            ) : active === "season" && breakdown.season ? (
                <div id="team-breakdown-panel" role="tabpanel" aria-labelledby="team-breakdown-tab-season">
                    <StatTable stats={breakdown.season} />
                </div>
            ) : (
                <div id="team-breakdown-panel" role="tabpanel" aria-labelledby="team-breakdown-tab-projected">
                    <StatTable stats={breakdown.projected.filter((stat) => !showsZero(stat))} />
                    {fullLineup && <StartersList starters={breakdown.starters} players={players} />}
                </div>
            )}
        </section>
    );
}
