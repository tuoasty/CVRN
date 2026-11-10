import Link from "next/link";
import {cn} from "@/lib/utils";
import {PlayerAvatar, TeamMark, TodayMark} from "../sections/TeamMark";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/app/components/ui/tooltip";
import type {FormEntry, HeroItem, LeaderCell, StatCell, Tape, WeekResult} from "../model/types";

type MatchItem = Extract<HeroItem, {kind: "match"}>;

function Header({children, href, linkLabel}: {children: React.ReactNode; href: string | null; linkLabel: string}) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <div className="min-w-0 truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{children}</div>
            {href && (
                <Link href={href} className="shrink-0 text-xs font-semibold underline underline-offset-4 hover:decoration-2">
                    {linkLabel}
                </Link>
            )}
        </div>
    );
}

function Row({label, home, away, better, inward}: {label: string; home: React.ReactNode; away: React.ReactNode; better?: "home" | "away" | null; inward?: boolean}) {
    return (
        <>
            <div className={cn("min-w-0 py-1 font-mono text-sm tabular-nums", inward && "text-right", better === "home" && "font-bold")}>{home}</div>
            <div className="self-center text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className={cn("min-w-0 py-1 font-mono text-sm tabular-nums", !inward && "text-right", better === "away" && "font-bold")}>{away}</div>
        </>
    );
}

function better(a: number | null | undefined, b: number | null | undefined, higherIsBetter = true): "home" | "away" | null {
    if (a == null || b == null || a === b) return null;
    return (a > b) === higherIsBetter ? "home" : "away";
}

function Form({form, align}: {form: FormEntry[]; align: "left" | "right"}) {
    if (form.length === 0) return <span className="text-muted-foreground">-</span>;
    return (
        <TooltipProvider>
            <span className={cn("flex gap-[3px]", align === "right" && "justify-end")}>
                {form.map((f, i) => {
                    const text = `${f.result === "W" ? "Won" : "Lost"} ${f.score} vs ${f.opponent} · ${f.label}`;
                    return (
                        <Tooltip key={i}>
                            <TooltipTrigger asChild>
                                <span
                                    tabIndex={0}
                                    aria-label={text}
                                    className={cn(
                                        "flex h-4 w-4 cursor-default items-center justify-center font-sans text-[10px] font-bold leading-none text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground",
                                        f.result === "W" ? "bg-success" : "bg-destructive",
                                    )}
                                >
                                    {f.result}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent className="font-sans text-xs">{text}</TooltipContent>
                        </Tooltip>
                    );
                })}
            </span>
        </TooltipProvider>
    );
}

function Leader({cell, align}: {cell: LeaderCell | null; align: "left" | "right"}) {
    if (!cell) return <div className={cn("py-1 text-sm text-muted-foreground", align === "right" && "text-right")}>-</div>;
    const head = (
        <span className={cn("flex items-center gap-1.5", align === "right" && "flex-row-reverse text-right")}>
            <PlayerAvatar src={cell.avatarUrl} size={22} />
            <span className="min-w-0 truncate text-[13px] font-semibold">{cell.name}</span>
        </span>
    );
    return (
        <div className="min-w-0 py-1">
            {cell.href ? <Link href={cell.href} className="hover:underline">{head}</Link> : head}
            {cell.line.length > 0 && (
                <div className={cn("mt-0.5 flex flex-wrap gap-x-2.5", align === "right" && "justify-end")}>
                    {cell.line.map(s => (
                        <div key={s.label} className={cn("leading-tight", align === "right" && "text-right")}>
                            <div className="font-mono text-[13px] font-semibold tabular-nums">{s.value}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function TapeRows({tape, inward = false}: {tape: Tape; inward?: boolean}) {
    const homeAlign = inward ? "right" : "left";
    const awayAlign = inward ? "left" : "right";
    const h = tape.home;
    const a = tape.away;
    if (!(h && a) && tape.matchups.length === 0) return null;
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_max-content_minmax(0,1fr)] gap-x-3">
            {h && a && (
                <>
                    <Row inward={inward} label="Record" home={h.record} away={a.record} better={better(parseInt(h.record), parseInt(a.record))} />
                    <Row inward={inward} label="Standing" home={h.rank ? `#${h.rank}` : "-"} away={a.rank ? `#${a.rank}` : "-"} better={better(h.rank, a.rank, false)} />
                    <Row inward={inward} label={tape.ratingLabel} home={h.rating?.toFixed(1) ?? "-"} away={a.rating?.toFixed(1) ?? "-"} better={better(h.rating, a.rating)} />
                    {(h.form.length > 0 || a.form.length > 0) && (
                        <Row inward={inward} label="Last 5" home={<Form form={h.form} align={homeAlign} />} away={<Form form={a.form} align={awayAlign} />} />
                    )}
                </>
            )}
            {tape.matchups.map(m => (
                <div key={m.category} className="contents">
                    <Leader cell={m.home} align={homeAlign} />
                    <div className="self-center text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{m.label}</div>
                    <Leader cell={m.away} align={awayAlign} />
                </div>
            ))}
        </div>
    );
}

function MatchCard({item}: {item: MatchItem}) {
    const homeWon = (item.homeSets ?? 0) > (item.awaySets ?? 0);
    const awayWon = (item.awaySets ?? 0) > (item.homeSets ?? 0);
    return (
        <div className="flex flex-col">
            <Header href={item.href} linkLabel={!item.isFinal ? "Match details" : item.hasStats ? "Box score" : "View match"}>
                {item.label}
                {!item.isFinal && <> · {item.isToday ? <TodayMark>Today {item.whenLabel}</TodayMark> : item.whenLabel}</>}
            </Header>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <TeamMark team={item.home} size={40} />
                    <TeamName team={item.home} />
                </div>
                {item.isFinal ? (
                    <div className="whitespace-nowrap font-mono text-2xl font-semibold tabular-nums">
                        <span className={cn(!homeWon && "text-muted-foreground")}>{item.homeSets ?? 0}</span>
                        <span className="mx-1.5 text-muted-foreground">-</span>
                        <span className={cn(!awayWon && "text-muted-foreground")}>{item.awaySets ?? 0}</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">vs</span>
                )}
                <div className="flex min-w-0 flex-col items-end gap-1.5 text-right sm:flex-row-reverse sm:items-center sm:gap-3">
                    <TeamMark team={item.away} size={40} />
                    <TeamName team={item.away} />
                </div>
            </div>
            {item.isFinal && item.setScores.length > 0 && (
                <div className="mt-1 text-center font-mono text-[11px] text-muted-foreground tabular-nums">
                    {item.setScores.map(s => `${s.home}-${s.away}`).join("   ")}
                </div>
            )}
            <div className="mt-2">
                <TapeRows tape={item.tape} />
            </div>
        </div>
    );
}

function TeamName({team}: {team: MatchItem["home"]}) {
    const name = (
        <span className="block min-w-0 max-w-full break-words text-base font-bold leading-tight line-clamp-2 sm:truncate sm:text-lg">{team.name}</span>
    );
    return team.href ? <Link href={team.href} className="block min-w-0 max-w-full hover:underline">{name}</Link> : name;
}

function SectionLabel({children}: {children: React.ReactNode}) {
    return <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{children}</div>;
}

function TotwLeader({label, cell}: {label: string; cell: LeaderCell}) {
    const who = (
        <span className="flex min-w-0 items-center gap-3">
            <PlayerAvatar src={cell.avatarUrl} size={40} />
            <span className="min-w-0 leading-tight">
                <span className="block truncate text-base font-semibold">{cell.name}</span>
                {cell.username && <span className="block truncate text-xs text-muted-foreground">@{cell.username}</span>}
            </span>
        </span>
    );
    return (
        <div className="flex items-center justify-between gap-4">
            {cell.href ? <Link href={cell.href} className="min-w-0 hover:underline">{who}</Link> : who}
            <div className="shrink-0 text-right">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
                {cell.line.length > 0 && (
                    <div className="mt-0.5 flex justify-end gap-x-4">
                        {cell.line.map(c => (
                            <div key={c.label} className="leading-tight">
                                <div className="font-mono text-sm font-semibold tabular-nums">{c.value}</div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function WeekResults({results}: {results: WeekResult[]}) {
    return (
        <div className="space-y-1">
            {results.map(r => (
                <div key={r.key} className="flex items-center gap-2 text-sm">
                    <span className={cn("flex h-4 w-4 items-center justify-center text-[10px] font-bold leading-none text-white", r.result === "W" ? "bg-success" : "bg-destructive")}>
                        {r.result}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">{r.score}</span>
                    <span className="text-muted-foreground">vs {r.opponent}</span>
                </div>
            ))}
        </div>
    );
}

function StatGrid({cells}: {cells: StatCell[]}) {
    return (
        <div className="mt-2 grid grid-cols-4 gap-x-4 gap-y-3">
            {cells.map(c => (
                <div key={c.label}>
                    <div className="font-mono text-xl font-semibold tabular-nums">{c.value}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
                </div>
            ))}
        </div>
    );
}

export function TapeCard({item}: {item: HeroItem}) {
    if (item.kind === "match") return <MatchCard item={item} />;
    if (item.kind === "potw") {
        return (
            <div className="flex flex-col">
                <Header href={item.player.href} linkLabel="Player profile">{item.label}</Header>
                <div className="mt-4 flex items-center gap-4">
                    <PlayerAvatar src={item.player.avatarUrl} size={40} />
                    <div className="min-w-0">
                        <div className="truncate text-3xl font-bold leading-tight">{item.player.name}</div>
                        {item.player.username && <div className="text-sm text-muted-foreground">@{item.player.username}</div>}
                    </div>
                </div>
                {(item.team || item.position) && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                        {item.team && <TeamMark team={item.team} size={24} />}
                        <span className="font-medium">{[item.team?.name, item.position].filter(Boolean).join(" · ")}</span>
                    </div>
                )}
                {item.description && <p className="mt-4 max-w-prose text-sm leading-relaxed">{item.description}</p>}
                {item.results.length > 0 && (
                    <div className="mt-5">
                        <WeekResults results={item.results} />
                    </div>
                )}
                {item.line.length > 0 && (
                    <div className="mt-6">
                        <SectionLabel>{item.statsLabel}</SectionLabel>
                        <StatGrid cells={item.line} />
                    </div>
                )}
            </div>
        );
    }
    if (item.kind === "totw") {
        return (
            <div className="flex flex-col">
                <Header href={item.team?.href ?? null} linkLabel="Team page">{item.label}</Header>
                {item.team && (
                    <div className="mt-4 flex items-center gap-4">
                        <TeamMark team={item.team} size={56} />
                        <div className="min-w-0">
                            <div className="truncate text-3xl font-bold leading-tight">{item.team.name}</div>
                            {(item.record || item.rank) && (
                                <div className="font-mono text-sm text-muted-foreground tabular-nums">
                                    {[item.record, item.rank ? `#${item.rank}` : null].filter(Boolean).join(" · ")}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {item.results.length > 0 && (
                    <div className="mt-5">
                        <WeekResults results={item.results} />
                    </div>
                )}
                {item.leaders.length > 0 && (
                    <div className="mt-5 space-y-3">
                        {item.leaders.map(l => l.cell && <TotwLeader key={l.category} label={l.label} cell={l.cell} />)}
                    </div>
                )}
            </div>
        );
    }
    return (
        <div className="flex flex-col">
            <Header href={item.href} linkLabel="Season archive">Champions</Header>
            <div className="mt-4 flex items-center gap-4">
                <TeamMark team={item.champion} size={72} />
                <div className="text-4xl font-bold leading-tight">{item.champion.name}</div>
            </div>
            {item.final && (
                <div className="mt-4 text-sm text-muted-foreground">
                    Grand Final · <span className="font-mono text-foreground">{item.champion.name} {item.final.championSets}-{item.final.opponentSets} {item.final.opponent.name}</span>
                </div>
            )}
            {item.podium.length > 0 && (
                <div className="mt-6 space-y-2">
                    {item.podium.map(p => (
                        <div key={p.place} className="grid grid-cols-[40px_28px_1fr] items-center gap-2 text-base">
                            <span className="font-mono text-muted-foreground">{p.place === 2 ? "2nd" : "3rd"}</span>
                            <TeamMark team={p.team} size={24} />
                            <span>{p.team.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
