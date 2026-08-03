"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { roundLabelShort, roundLabelLong } from "@/app/utils/playoffRounds";
import { cn } from "@/lib/utils";

interface MatchTypeTabsProps {
    activeTab: "season" | "playoffs";
    playoffsEnabled: boolean;
    onTabChange: (tab: "season" | "playoffs") => void;
}

export function MatchTypeTabs({ activeTab, playoffsEnabled, onTabChange }: MatchTypeTabsProps) {
    return (
        <div className="grid grid-cols-2 border border-border rounded-sm overflow-hidden">
            <button
                onClick={() => onTabChange("season")}
                className={cn(
                    "py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-r border-border",
                    activeTab === "season"
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
            >
                Regular Season
            </button>
            <button
                onClick={() => playoffsEnabled && onTabChange("playoffs")}
                disabled={!playoffsEnabled}
                className={cn(
                    "py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                    activeTab === "playoffs"
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    !playoffsEnabled && "opacity-40 cursor-not-allowed"
                )}
            >
                Playoffs
            </button>
        </div>
    );
}

interface WeekSelectorProps {
    effectiveWeek: number;
    weeks: number[];
    onWeekChange: (week: number) => void;
}

export function WeekSelector({ effectiveWeek, weeks, onWeekChange }: WeekSelectorProps) {
    const [open, setOpen] = useState(false);
    const activeIdx = weeks.indexOf(effectiveWeek);
    const canGoPrev = activeIdx > 0;
    const canGoNext = activeIdx < weeks.length - 1;

    return (
        <>
            {}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div className="sm:hidden flex items-center border border-border rounded-md h-11 overflow-hidden cursor-pointer">
                        <button
                            onClick={(e) => { e.stopPropagation(); if (canGoPrev) { onWeekChange(weeks[activeIdx - 1]); setOpen(false); } }}
                            disabled={!canGoPrev}
                            className={cn("w-11 h-full flex items-center justify-center shrink-0 transition-colors", canGoPrev ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/20 cursor-not-allowed")}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex-1 h-full flex items-center justify-center text-sm font-semibold">
                            Week {effectiveWeek}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); if (canGoNext) { onWeekChange(weeks[activeIdx + 1]); setOpen(false); } }}
                            disabled={!canGoNext}
                            className={cn("w-11 h-full flex items-center justify-center shrink-0 transition-colors", canGoNext ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/20 cursor-not-allowed")}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="center">
                    {weeks.map(w => (
                        <button
                            key={w}
                            onClick={() => { onWeekChange(w); setOpen(false); }}
                            className={cn(
                                "w-full px-3 py-2.5 text-sm text-center transition-colors border-b border-border last:border-b-0",
                                w === effectiveWeek
                                    ? "font-semibold text-foreground bg-muted/40"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                            )}
                        >
                            Week {w}
                        </button>
                    ))}
                </PopoverContent>
            </Popover>

            {}
            <div className="hidden sm:flex overflow-x-auto border border-border rounded-sm overflow-hidden">
                {weeks.map(w => {
                    const isActive = w === effectiveWeek;
                    return (
                        <button
                            key={w}
                            onClick={() => onWeekChange(w)}
                            className={cn(
                                "flex flex-col items-center justify-center shrink-0 min-w-[72px] flex-1 px-2 py-2.5 border-r border-border last:border-r-0 transition-colors",
                                isActive
                                    ? "bg-primary/20 text-primary"
                                    : w < effectiveWeek
                                        ? "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            <span className="text-xs font-semibold uppercase tracking-wider">WEEK {w}</span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}

interface PlayoffStepperProps {
    rounds: string[];
    effectiveRound: string;
    roundCountMap: Map<string, number>;
    onRoundChange: (round: string) => void;
}

export function PlayoffStepper({ rounds, effectiveRound, roundCountMap, onRoundChange }: PlayoffStepperProps) {
    const [open, setOpen] = useState(false);
    const activeIdx = rounds.indexOf(effectiveRound);
    const canGoPrev = activeIdx > 0;
    const canGoNext = activeIdx < rounds.length - 1;

    return (
        <>
            {}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div className="sm:hidden flex items-center border border-border rounded-md h-11 overflow-hidden cursor-pointer">
                        <button
                            onClick={(e) => { e.stopPropagation(); if (canGoPrev) { onRoundChange(rounds[activeIdx - 1]); setOpen(false); } }}
                            disabled={!canGoPrev}
                            className={cn("w-11 h-full flex items-center justify-center shrink-0 transition-colors", canGoPrev ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/20 cursor-not-allowed")}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex-1 h-full flex items-center justify-center text-sm font-semibold">
                            {roundLabelLong(effectiveRound)}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); if (canGoNext) { onRoundChange(rounds[activeIdx + 1]); setOpen(false); } }}
                            disabled={!canGoNext}
                            className={cn("w-11 h-full flex items-center justify-center shrink-0 transition-colors", canGoNext ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/20 cursor-not-allowed")}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="center">
                    {rounds.map(round => (
                        <button
                            key={round}
                            onClick={() => { onRoundChange(round); setOpen(false); }}
                            className={cn(
                                "w-full px-3 py-2.5 text-sm text-center transition-colors border-b border-border last:border-b-0",
                                round === effectiveRound
                                    ? "font-semibold text-foreground bg-muted/40"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                            )}
                        >
                            {roundLabelLong(round)}
                        </button>
                    ))}
                </PopoverContent>
            </Popover>

            {}
            <div className="hidden sm:flex overflow-x-auto gap-0 scrollbar-hide border border-border rounded-sm">
                {rounds.map((round, idx) => {
                    const isCompleted = idx < activeIdx;
                    const isActive = round === effectiveRound;
                    const count = roundCountMap.get(round);
                    return (
                        <button
                            key={round}
                            onClick={() => onRoundChange(round)}
                            className={cn(
                                "flex flex-col items-center justify-center shrink-0 min-w-[80px] flex-1 px-2 py-2.5 text-xs font-semibold border-r border-border last:border-r-0 transition-colors",
                                isActive
                                    ? "bg-primary/20 text-primary"
                                    : isCompleted
                                        ? "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            <span>{roundLabelShort(round)}</span>
                            <span className={cn(
                                "text-[10px] font-normal mt-0.5",
                                count === undefined ? "invisible" : isActive ? "text-primary/60" : "text-muted-foreground/50"
                            )}>
                                {count !== undefined ? `${count} match${count !== 1 ? "es" : ""}` : "0 matches"}
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
