"use client";

import React, { useState } from "react";
import { usePlayoffBrackets, usePlayoffConfigs, generateBracket, resetBrackets } from "@/app/hooks/usePlayoffs";
import { useSeasons } from "@/app/hooks/useSeasons";
import { mutate } from "swr";
import { templates } from "@/server/domains/playoff/helpers/playoffTemplates";
import { SeedChooserDialog } from "./SeedChooserDialog";
import { Button } from "@/app/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { toast } from "@/app/utils/toast";
import { errorCodeToUserMessage } from "@/app/lib/errorMessages";
import { clientLogger } from "@/app/utils/clientLogger";
import { PlayoffBracketDisplay } from "./PlayoffBracketDisplay";
import { Loader2, Trash2, Trophy, ListOrdered, X } from "lucide-react";
import { AdminPageHeader } from "@/app/components/admin/AdminPageHeader";
import { useAdminContextStore } from "@/app/stores/adminContextStore";

export default function PlayoffManagementPage() {
    const { selectedSeasonId, selectedRegionId } = useAdminContextStore();
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSeedDialogOpen, setIsSeedDialogOpen] = useState(false);
    const [customSeedOrder, setCustomSeedOrder] = useState<string[] | null>(null);

    const { seasons: allSeasons } = useSeasons();
    const { configs } = usePlayoffConfigs();
    const { brackets, incomingMap, isLoading: loadingBrackets } = usePlayoffBrackets(selectedSeasonId ?? null);

    const selectedSeason = allSeasons.find((s) => s.id === selectedSeasonId);
    const hasPlayoffStarted = selectedSeason?.playoff_started || false;

    const seasonIdValue = selectedSeasonId ?? "";
    const regionIdValue = selectedRegionId ?? "";

    // Seed count for the selected season = its playoff config template's team count.
    const seasonConfig = configs.find((c) => c.id === selectedSeason?.playoff_config_id);
    const templateKey = seasonConfig?.template;
    const totalTeams =
        templateKey && templateKey in templates
            ? templates[templateKey as keyof typeof templates].teams
            : 0;

    const handleGenerateBracket = async () => {
        if (!seasonIdValue) {
            toast.error("No season selected");
            return;
        }

        setIsProcessing(true);
        const result = await generateBracket({
            seasonId: seasonIdValue,
            seedOrder: customSeedOrder ?? undefined,
        });

        if (!result.ok) {
            clientLogger.error("PlayoffManagementPage", "Generate bracket failed", { seasonId: seasonIdValue, error: result.error });
            toast.error(errorCodeToUserMessage(result.error.code), result.error.message);
            setIsProcessing(false);
            return;
        }

        toast.success("Playoff bracket generated successfully");
        await mutate("seasons");
        setIsProcessing(false);
    };

    const handleResetBrackets = async () => {
        if (!seasonIdValue) {
            toast.error("No season selected");
            return;
        }

        setIsProcessing(true);
        const result = await resetBrackets(seasonIdValue);

        if (!result.ok) {
            clientLogger.error("PlayoffManagementPage", "Reset brackets failed", { seasonId: seasonIdValue, error: result.error });
            toast.error(errorCodeToUserMessage(result.error.code), result.error.message);
            setIsProcessing(false);
            return;
        }

        toast.success("Playoff brackets reset successfully");
        setIsResetDialogOpen(false);
        await mutate("seasons");
        setIsProcessing(false);
    };

    return (
        <div className="admin-container">
            <div className="admin-section">
                <AdminPageHeader
                    icon={Trophy}
                    title="Playoff Brackets"
                    description="Generate and manage playoff brackets"
                />

                {seasonIdValue && (
                    <div className="panel p-4 sm:p-6 mb-6 border-l-4 border-l-primary/30">
                        {!hasPlayoffStarted && (
                            <div className="space-y-3">
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button
                                        onClick={handleGenerateBracket}
                                        disabled={isProcessing || brackets.length > 0}
                                        className="flex-1 rounded-sm bg-primary hover:bg-primary/90"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Trophy className="mr-2 h-4 w-4" />
                                                Generate Playoff Bracket
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsSeedDialogOpen(true)}
                                        disabled={isProcessing || brackets.length > 0 || totalTeams === 0}
                                        className="rounded-sm sm:w-auto"
                                    >
                                        <ListOrdered className="mr-2 h-4 w-4" />
                                        Custom Seed
                                    </Button>
                                </div>
                                {customSeedOrder && (
                                    <div className="flex items-center justify-between rounded-sm bg-primary/5 border border-primary/20 px-3 py-2">
                                        <span className="text-xs text-muted-foreground">
                                            Custom seeding set for {customSeedOrder.length} teams — this order will be used on generate.
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCustomSeedOrder(null)}
                                            className="h-7 rounded-sm text-xs"
                                        >
                                            <X className="mr-1 h-3 w-3" />
                                            Clear
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {hasPlayoffStarted && (
                            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        disabled={isProcessing || brackets.length === 0}
                                        className="w-full rounded-sm"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Reset Playoff Brackets
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-sm">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Reset Playoff Brackets?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete all playoff matches, brackets, and related data for this season.
                                            This action cannot be undone. You will need to regenerate the bracket after reset.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleResetBrackets}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-sm"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Resetting...
                                                </>
                                            ) : (
                                                "Reset Brackets"
                                            )}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                )}

                {loadingBrackets ? (
                    <div className="panel p-12 border-l-4 border-l-primary/30">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading bracket...</p>
                        </div>
                    </div>
                ) : seasonIdValue && brackets.length > 0 ? (
                    <PlayoffBracketDisplay brackets={brackets} incomingMap={incomingMap} seasonId={seasonIdValue} regionId={regionIdValue} linkContext="admin" />
                ) : seasonIdValue && !isProcessing ? (
                    <div className="panel p-12 border-l-4 border-l-muted">
                        <p className="text-sm text-muted-foreground text-center">
                            {hasPlayoffStarted ? "No brackets found" : "Click 'Generate Playoff Bracket' to create the bracket structure"}
                        </p>
                    </div>
                ) : !seasonIdValue ? (
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                Select a season in the navbar to manage playoffs
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>

            {seasonIdValue && totalTeams > 0 && (
                <SeedChooserDialog
                    open={isSeedDialogOpen}
                    onOpenChange={setIsSeedDialogOpen}
                    seasonId={seasonIdValue}
                    regionId={regionIdValue}
                    totalTeams={totalTeams}
                    onConfirm={(seedOrder) => {
                        setCustomSeedOrder(seedOrder);
                        setIsSeedDialogOpen(false);
                    }}
                />
            )}
        </div>
    );
}
