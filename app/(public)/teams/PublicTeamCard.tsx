"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
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
            className={`group flex flex-col overflow-hidden rounded-sm border border-border bg-card transition-all duration-150 ${
                canNavigate ? "cursor-pointer hover:border-primary/40 hover:shadow-md" : "opacity-60"
            }`}
        >
            {/* Hero area */}
            <div
                className="relative flex items-center justify-center h-36"
                style={{ backgroundColor: brickColor ? `${brickColor}18` : undefined }}
            >
                {/* Left color bar */}
                {brickColor && (
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: brickColor }}
                    />
                )}

                {team.logo_url ? (
                    <div className="relative w-20 h-20 transition-transform duration-150 group-hover:scale-105">
                        <Image
                            src={team.logo_url}
                            alt={team.name || "Team"}
                            fill
                            sizes="80px"
                            className="object-contain mix-blend-multiply dark:mix-blend-screen"
                        />
                    </div>
                ) : (
                    <div
                        className="w-20 h-20 rounded-sm border border-border flex items-center justify-center"
                        style={{ backgroundColor: brickColor ? `${brickColor}30` : undefined }}
                    >
                        <span
                            className="text-2xl font-bold uppercase"
                            style={{ color: brickColor ?? undefined }}
                        >
                            {team.name?.slice(0, 2) || "??"}
                        </span>
                    </div>
                )}
            </div>

            {/* Info area */}
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-border">
                <span className="text-sm font-bold truncate min-w-0 leading-tight">
                    {team.name}
                </span>

                {team.brick_number && brickColor && (
                    <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm shrink-0 tabular-nums"
                        style={{
                            backgroundColor: `${brickColor}20`,
                            color: brickColor,
                            border: `1px solid ${brickColor}40`,
                        }}
                    >
                        #{team.brick_number}
                    </span>
                )}
            </div>
        </div>
    );
}
