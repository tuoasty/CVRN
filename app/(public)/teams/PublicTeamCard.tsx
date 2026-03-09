"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { TeamWithRegion } from "@/server/dto/team.dto";

interface PublicTeamCardProps {
    team: TeamWithRegion;
}

export default function PublicTeamCard({ team }: PublicTeamCardProps) {
    const router = useRouter();

    const regionCode = team.seasons?.regions?.code?.toLowerCase();
    const seasonSlug = team.seasons?.slug?.toLowerCase();
    const teamSlug = team.slug?.toLowerCase();

    const handleClick = () => {
        if (!regionCode || !seasonSlug || !teamSlug) return;
        router.push(`/teams/${encodeURIComponent(regionCode)}/${encodeURIComponent(seasonSlug)}/${encodeURIComponent(teamSlug)}`);
    };

    const canNavigate = !!regionCode && !!seasonSlug && !!teamSlug;
    const brickColor = team.brick_color;

    return (
        <div
            onClick={handleClick}
            className={`panel overflow-hidden flex flex-col transition-all duration-200 ${
                canNavigate
                    ? "cursor-pointer hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
                    : "opacity-60"
            }`}
        >
            {brickColor && (
                <div
                    className="h-1 w-full shrink-0"
                    style={{ backgroundColor: brickColor }}
                />
            )}

            <div className="p-4 flex flex-col items-center gap-3">
                <div className="relative w-16 h-16 shrink-0">
                    {team.logo_url ? (
                        <Image
                            src={team.logo_url}
                            alt={team.name || "Team"}
                            fill
                            sizes="64px"
                            className="object-contain mix-blend-multiply dark:mix-blend-screen"
                        />
                    ) : (
                        <div className="w-full h-full rounded-sm bg-muted/50 border border-border flex items-center justify-center">
                            <span className="text-xs text-muted-foreground font-semibold uppercase">
                                {team.name?.slice(0, 2) || "??"}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center gap-1 w-full">
                    <span className="text-sm font-semibold text-center leading-tight line-clamp-2">
                        {team.name}
                    </span>
                    {team.brick_number && brickColor && (
                        <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm"
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
        </div>
    );
}