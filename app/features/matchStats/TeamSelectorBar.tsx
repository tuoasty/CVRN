"use client";

import Image from "next/image";
import { DefaultTeamLogo } from "@/app/components/ui/DefaultTeamLogo";
import {Team} from "@/shared/types/db";
import {getLogoClassName} from "@/app/lib/logoClass";
import {cn} from "@/lib/utils";

export type TeamView = "home-only" | "away-only";

type Props = {
    homeTeam: Team | null;
    awayTeam: Team | null;
    view: TeamView;
    onViewChange: (v: TeamView) => void;
};

const isHex = (color: string | null | undefined): color is string => {
    if (!color) return false;
    return /^#[0-9A-Fa-f]{6}$/.test(color) || /^#[0-9A-Fa-f]{3}$/.test(color);
};

export default function TeamSelectorBar({homeTeam, awayTeam, view, onViewChange}: Props) {
    if (!homeTeam || !awayTeam) return null;

    const homeSelected = view === "home-only";
    const selectedColor = homeSelected ? homeTeam.brick_color : awayTeam.brick_color;
    const selectedHex = isHex(selectedColor) ? selectedColor : null;

    const gradient = selectedHex
        ? homeSelected
            ? `linear-gradient(to right, ${selectedHex}33 0%, ${selectedHex}1F 25%, ${selectedHex}0A 45%, transparent 60%)`
            : `linear-gradient(to right, transparent 40%, ${selectedHex}0A 55%, ${selectedHex}1F 75%, ${selectedHex}33 100%)`
        : undefined;

    const borderColor = selectedHex ?? "hsl(var(--border))";

    return (
        <div
            className="relative grid grid-cols-2 border rounded-sm overflow-hidden"
            style={{
                background: gradient,
                borderColor,
            }}
        >
            <TeamHalf
                team={homeTeam}
                selected={homeSelected}
                side="left"
                onClick={() => onViewChange("home-only")}
            />
            <TeamHalf
                team={awayTeam}
                selected={!homeSelected}
                side="right"
                onClick={() => onViewChange("away-only")}
            />
        </div>
    );
}

function TeamHalf({
    team,
    selected,
    side,
    onClick,
}: {
    team: Team;
    selected: boolean;
    side: "left" | "right";
    onClick: () => void;
}) {
    const content = (
        <>
            <div
                className={cn(
                    "relative w-7 h-7 rounded-sm overflow-hidden shrink-0 transition-all",
                    !selected && "grayscale",
                )}
            >
                {team.logo_url ? (
                    <Image
                        src={team.logo_url}
                        alt={team.name}
                        fill
                        sizes="28px"
                        className={getLogoClassName(team.logo_bg_removed)}
                    />
                ) : (
                    <DefaultTeamLogo sizes="28px" alt={team.name} />
                )}
            </div>
            <span
                className={cn(
                    "font-semibold tracking-wide truncate transition-all",
                    selected
                        ? "text-sm uppercase text-foreground"
                        : "text-xs uppercase text-foreground/40",
                )}
            >
                {team.name}
            </span>
        </>
    );

    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            disabled={selected}
            className={cn(
                "flex items-center gap-2.5 h-12 px-4 min-w-0 transition-colors",
                side === "right" && "flex-row-reverse",
                !selected && "cursor-pointer hover:bg-foreground/[0.02]",
                selected && "cursor-default",
            )}
        >
            {content}
        </button>
    );
}
