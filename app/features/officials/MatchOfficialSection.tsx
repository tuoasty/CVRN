"use client";

import React, { useEffect, useState } from "react";
import { useOfficialStore } from "@/app/stores/officialStore";
import { MatchOfficialWithDetails } from "@/server/services/matchOfficial.service";
import { OfficialType } from "@/server/dto/matchOfficial.dto";
import { clientLogger } from "@/app/utils/clientLogger";
import Image from "next/image";
import { Button } from "@/app/components/ui/button";
import OfficialSearchDialog from "./OfficialSearchDialog";
import { X } from "lucide-react";

interface MatchOfficialSectionProps {
    matchId: string;
    officialType: OfficialType;
    title: string;
}

export default function MatchOfficialSection({
                                                  matchId,
                                                  officialType,
                                                  title,
                                              }: MatchOfficialSectionProps) {
    const { fetchMatchOfficials, matchOfficialsCache, removeOfficialFromMatch } = useOfficialStore();

    const [officials, setOfficials] = useState<MatchOfficialWithDetails[]>([]);

    useEffect(() => {
        loadOfficials();
    }, [matchId]);

    const loadOfficials = async () => {
        await fetchMatchOfficials(matchId);

        const cached = matchOfficialsCache.get(matchId);
        if (cached) {
            const filtered = cached.data.filter((mo) => mo.official_type === officialType);
            setOfficials(filtered);
            clientLogger.info("MatchOfficialsSection", "Officials loaded", {
                matchId,
                officialType,
                count: filtered.length,
            });
        }
    };

    const handleRemove = async (officialId: string) => {
        clientLogger.info("MatchOfficialsSection", "Removing official", {
            matchId,
            officialId,
            officialType,
        });

        const success = await removeOfficialFromMatch(matchId, officialId, officialType);

        if (success) {
            clientLogger.info("MatchOfficialsSection", "Official removed successfully", {
                matchId,
                officialId,
            });
            await loadOfficials();
        } else {
            alert("Failed to remove official");
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{title}</h3>
                <OfficialSearchDialog
                    matchId={matchId}
                    officialType={officialType}
                    onAssigned={loadOfficials}
                />
            </div>

            {officials.length === 0 ? (
                <div className="text-sm text-muted-foreground">No {title.toLowerCase()} assigned</div>
            ) : (
                <div className="space-y-2">
                    {officials.map((mo) => (
                        <div
                            key={mo.id}
                            className="flex items-center justify-between p-2 border rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                {mo.official.avatar_url && (
                                    <div className="relative w-8 h-8 rounded-full overflow-hidden">
                                        <Image
                                            src={mo.official.avatar_url}
                                            alt={mo.official.username || "Official"}
                                            fill
                                            sizes="32px"
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div>
                                    <div className="text-sm font-medium">
                                        {mo.official.display_name || mo.official.username}
                                    </div>
                                    {mo.official.display_name && (
                                        <div className="text-xs text-muted-foreground">
                                            @{mo.official.username}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemove(mo.official.id)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}