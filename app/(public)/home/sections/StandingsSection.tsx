import Link from "next/link";
import {cn} from "@/lib/utils";
import {SectionHeading} from "./SectionHeading";
import {TeamMark} from "./TeamMark";
import type {HomeView} from "../model/types";

export function StandingsSection({title, ratingLabel, rows, href}: HomeView["standings"]) {
    if (rows.length === 0) return null;
    const head = "pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground";
    return (
        <section aria-label={title}>
            <SectionHeading title={title} href={href} linkLabel="Full table" />
            <table className="mt-2 w-full table-fixed border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border">
                        <th scope="col" className={cn(head, "w-8 px-1 text-left")}>#</th>
                        <th scope="col" className={cn(head, "text-left")}>Team</th>
                        <th scope="col" className={cn(head, "w-12 text-right")}>W-L</th>
                        <th scope="col" className={cn(head, "w-12 text-right")}>Sets</th>
                        <th scope="col" className={cn(head, "w-16 pr-1 text-right")}>{ratingLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        <tr key={row.teamId} className={cn(row.belowCutoff && "text-muted-foreground", row.cutoffAfter && "[&>td]:pb-3")}>
                            <td className="px-1 py-1.5 font-mono text-xs tabular-nums text-muted-foreground">{row.rank}</td>
                            <td className="py-1.5 pr-2">
                                <span className="flex min-w-0 items-center gap-2">
                                    <TeamMark team={row.team} size={24} className={cn(row.belowCutoff && "opacity-60")} />
                                    {row.team.href ? (
                                        <Link href={row.team.href} className="truncate hover:underline hover:underline-offset-4">
                                            {row.team.name}
                                        </Link>
                                    ) : (
                                        <span className="truncate">{row.team.name}</span>
                                    )}
                                </span>
                            </td>
                            <td className="py-1.5 text-right font-mono text-xs tabular-nums">{row.record}</td>
                            <td className="py-1.5 text-right font-mono text-xs tabular-nums">{row.sets}</td>
                            <td className="py-1.5 pr-1 text-right font-mono text-xs font-semibold tabular-nums">
                                {Number.isInteger(row.rating) ? row.rating : row.rating.toFixed(1)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}
