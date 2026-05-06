"use client";

import React, { useState } from "react";
import { usePlayoffBrackets, generateBracket, resetBrackets } from "@/app/hooks/usePlayoffs";
import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { mutate } from "swr";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
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
import { PlayoffBracketDisplay } from "./PlayoffBracketDisplay";
import { Loader2, Trash2, Trophy } from "lucide-react";
import { useAdminReady } from "@/app/admin/AdminReadyContext";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function PlayoffManagementPage() {
    const [selectedRegionId, setSelectedRegionId] = useState<string>("");
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const ready = useAdminReady();

    const { regions } = useRegions();
    const { seasons: allSeasons } = useSeasons();
    const { brackets, isLoading: loadingBrackets } = usePlayoffBrackets(selectedSeasonId || null);

    const filteredSeasons = selectedRegionId
        ? allSeasons.filter((s) => s.region_id === selectedRegionId)
        : [];

    const handleGenerateBracket = async () => {
        if (!selectedSeasonId) {
            toast.error("No season selected");
            return;
        }

        setIsProcessing(true);
        try {
            await generateBracket({ seasonId: selectedSeasonId });
            toast.success("Playoff bracket generated successfully");
            await mutate("seasons");
        } catch (error) {
            const message = error instanceof Error ? error.message : undefined;
            toast.error("Failed to generate bracket", message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResetBrackets = async () => {
        if (!selectedSeasonId) {
            toast.error("No season selected");
            return;
        }

        setIsProcessing(true);
        try {
            await resetBrackets(selectedSeasonId);
            toast.success("Playoff brackets reset successfully");
            setIsResetDialogOpen(false);
            await mutate("seasons");
        } catch (error) {
            const message = error instanceof Error ? error.message : undefined;
            toast.error("Failed to reset brackets", message);
        } finally {
            setIsProcessing(false);
        }
    };

    const selectedSeason = allSeasons.find(s => s.id === selectedSeasonId);
    const hasPlayoffStarted = selectedSeason?.playoff_started || false;

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="admin-header">
                    <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                        <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                            <Trophy className="h-7 w-7 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Playoff Brackets
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Generate and manage playoff brackets
                            </p>
                        </div>
                    </div>
                </div>

                <div className="panel p-4 sm:p-6 max-w-2xl mb-6 border-l-4 border-l-primary/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Region</label>
                            {ready ? (
                                <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                                    <SelectTrigger className="rounded-sm w-full">
                                        <SelectValue placeholder="Select region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {regions.map((region) => (
                                            <SelectItem key={region.id} value={region.id}>
                                                {region.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Skeleton className="h-9 w-full rounded-sm" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Season</label>
                            {ready ? (
                                <Select
                                    value={selectedSeasonId}
                                    onValueChange={setSelectedSeasonId}
                                    disabled={!selectedRegionId}
                                >
                                    <SelectTrigger className="rounded-sm w-full">
                                        <SelectValue placeholder={selectedRegionId ? "Select season" : "Select region first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredSeasons.map((season) => (
                                            <SelectItem key={season.id} value={season.id}>
                                                {season.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Skeleton className="h-9 w-full rounded-sm" />
                            )}
                        </div>
                    </div>

                    {ready && selectedSeasonId && !hasPlayoffStarted && (
                        <div className="mt-4">
                            <Button
                                onClick={handleGenerateBracket}
                                disabled={isProcessing || brackets.length > 0}
                                className="w-full rounded-sm bg-primary hover:bg-primary/90"
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
                        </div>
                    )}

                    {ready && selectedSeasonId && hasPlayoffStarted && (
                        <div className="mt-4">
                            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        disabled={isProcessing || brackets.length == 0}
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
                        </div>
                    )}
                </div>

                {loadingBrackets ? (
                    <div className="panel p-12 border-l-4 border-l-primary/30">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading bracket...</p>
                        </div>
                    </div>
                ) : selectedSeasonId && brackets.length > 0 ? (
                    <PlayoffBracketDisplay brackets={brackets} seasonId={selectedSeasonId} regionId={selectedRegionId} />
                ) : selectedSeasonId && !isProcessing ? (
                    <div className="panel p-12 border-l-4 border-l-muted">
                        <p className="text-sm text-muted-foreground text-center">
                            {hasPlayoffStarted ? "No brackets found" : "Click 'Generate Playoff Bracket' to create the bracket structure"}
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}