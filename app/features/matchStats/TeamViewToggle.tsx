"use client";

import Image from "next/image";
import {Team} from "@/shared/types/db";
import {Tooltip, TooltipContent, TooltipTrigger, TooltipProvider} from "@/app/components/ui/tooltip";
import {getLogoClassName} from "@/app/lib/logoClass";
import {cn} from "@/lib/utils";

export type MatchView = "home-only" | "away-only";

type Props = {
    homeTeam: Team | null;
    awayTeam: Team | null;
    view: MatchView;
    onViewChange: (v: MatchView) => void;
    detailed: boolean;
    onDetailedChange: (d: boolean) => void;
};

const teamColorBg = (color: string | null | undefined, alphaHex: string): string | undefined => {
    if (!color) return undefined;
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) return `${color}${alphaHex}`;
    if (/^#[0-9A-Fa-f]{3}$/.test(color)) return `${color}${alphaHex}`;
    return undefined;
};

export default function TeamViewToggle({
    homeTeam,
    awayTeam,
    view,
    onViewChange,
    detailed,
    onDetailedChange,
}: Props) {
    const homeActive = view === "home-only";
    const awayActive = view === "away-only";

    const handleClickHome = () => {
        onViewChange("home-only");
    };

    const handleClickAway = () => {
        onViewChange("away-only");
    };

    const showTogglePills = !!homeTeam && !!awayTeam;

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {showTogglePills && (
                    <div className="flex gap-2">
                        <TogglePill
                            team={homeTeam!}
                            active={homeActive}
                            onClick={handleClickHome}
                        />
                        <TogglePill
                            team={awayTeam!}
                            active={awayActive}
                            onClick={handleClickAway}
                        />
                    </div>
                )}

                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={detailed}
                        onChange={e => onDetailedChange(e.target.checked)}
                        className="accent-primary"
                    />
                    Detailed stats
                </label>
            </div>
        </TooltipProvider>
    );
}

function TogglePill({
    team,
    active,
    onClick,
}: {
    team: Team;
    active: boolean;
    onClick: () => void;
}) {
    const pillContent = (
        <>
            <div
                className={cn(
                    "relative w-5 h-5 rounded-sm overflow-hidden shrink-0",
                    !active && "grayscale opacity-50",
                )}
            >
                {team.logo_url ? (
                    <Image
                        src={team.logo_url}
                        alt={team.name}
                        fill
                        sizes="20px"
                        className={getLogoClassName(team.logo_bg_removed)}
                    />
                ) : (
                    <div className="w-full h-full bg-muted" />
                )}
            </div>
            <span className="text-sm font-medium truncate">{team.name}</span>
        </>
    );

    const pillClassName = cn(
        "flex items-center gap-2 h-9 px-3 rounded-sm border-2 transition-all min-w-0 max-w-[200px]",
        active
            ? "text-foreground"
            : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40 cursor-pointer",
    );

    const activeStyle = active
        ? {
              borderColor: team.brick_color || undefined,
              backgroundColor: teamColorBg(team.brick_color, "1A") || "transparent",
          }
        : undefined;

    return (
        <button
            type="button"
            aria-pressed={active}
            className={pillClassName}
            style={activeStyle}
            onClick={onClick}
        >
            {pillContent}
        </button>
    );
}
