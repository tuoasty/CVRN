"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { TeamWithRegion } from "@/server/domains/team";

interface PublicTeamCardProps {
    team: TeamWithRegion;
}

export default function PublicTeamCard({ team }: PublicTeamCardProps) {
    const router = useRouter();

    const regionCode = team.seasons?.regions?.code?.toLowerCase();
    const seasonSlug = team.seasons?.slug?.toLowerCase();
    const teamSlug = team.slug?.toLowerCase();

    const canNavigate = !!regionCode && !!seasonSlug && !!teamSlug;
    const brickColor = team.brick_color;

    const handleClick = () => {
        if (!canNavigate) return;
        router.push(`/teams/${encodeURIComponent(regionCode!)}/${encodeURIComponent(seasonSlug!)}/${encodeURIComponent(teamSlug!)}`);
    };

    return (
        <div
            onClick={handleClick}
            className={`flex items-center gap-3 px-4 py-3 bg-card transition-colors duration-150 ${
                canNavigate
                    ? "cursor-pointer hover:bg-muted/50"
                    : "opacity-60"
            }`}
        >
            <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: brickColor ?? "transparent" }}
            />

            <div className="relative w-9 h-9 shrink-0">
                {team.logo_url ? (
                    <Image
                        src={team.logo_url}
                        alt={team.name || "Team"}
                        fill
                        sizes="36px"
                        className="object-contain mix-blend-multiply dark:mix-blend-screen"
                    />
                ) : (
                    <div className="w-full h-full rounded-sm bg-muted/50 border border-border flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                            {team.name?.slice(0, 2) || "??"}
                        </span>
                    </div>
                )}
            </div>

            <span className="flex-1 text-sm font-semibold truncate min-w-0">
                {team.name}
            </span>

            {team.brick_number && brickColor && (
                <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm shrink-0"
                    style={{
                        backgroundColor: `${brickColor}20`,
                        color: brickColor,
                        border: `1px solid ${brickColor}40`,
                    }}
                >
                    #{team.brick_number}
                </span>
            )}

            {canNavigate && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
        </div>
    );
}
