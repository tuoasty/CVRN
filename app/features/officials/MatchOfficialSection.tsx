"use client";

import React, { useState } from "react";
import { useMatchOfficials, removeOfficialFromMatch } from "@/app/hooks/useOfficials";
import { OfficialType } from "@/server/domains/matchOfficial";
import { clientLogger } from "@/app/utils/clientLogger";
import Image from "next/image";
import { Button } from "@/app/components/ui/button";
import OfficialSearchDialog from "./OfficialSearchDialog";
import { X } from "lucide-react";
import {toast} from "@/app/utils/toast";

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
    const { officials: allOfficials, mutate } = useMatchOfficials(matchId);
    
    // Filter officials by type
    const officials = allOfficials.filter(mo => mo.official_type === officialType);

    const [removing, setRemoving] = useState<string | null>(null);

    const handleRemove = async (officialId: string) => {
        setRemoving(officialId);
        clientLogger.info("MatchOfficialsSection", "Removing official", {
            matchId,
            officialId,
            officialType,
        });

        try {
            await removeOfficialFromMatch(matchId, officialId, officialType);
            clientLogger.info("MatchOfficialsSection", "Official removed successfully", {
                matchId,
                officialId,
            });
            mutate();
        } catch {
            toast.error("Failed to remove official");
        }

        setRemoving(null);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium">{title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {officials.length} assigned
                    </p>
                </div>
                <OfficialSearchDialog
                    matchId={matchId}
                    officialType={officialType}
                    onAssigned={() => mutate()}
                />
            </div>

            {officials.length === 0 ? (
                <div className="panel p-4">
                    <p className="text-sm text-muted-foreground text-center">
                        No {title.toLowerCase()} assigned
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {officials.map((mo) => (
                        <div
                            key={mo.id}
                            className="panel p-3 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                {mo.official.avatar_url && (
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border">
                                        <Image
                                            src={mo.official.avatar_url}
                                            alt={mo.official.username || "Official"}
                                            fill
                                            sizes="40px"
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div>
                                    <div className="text-sm font-medium">
                                        {mo.official.display_name || mo.official.username}
                                    </div>
                                    {mo.official.display_name && mo.official.username && (
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
                                disabled={removing === mo.official.id}
                                className="rounded-sm"
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