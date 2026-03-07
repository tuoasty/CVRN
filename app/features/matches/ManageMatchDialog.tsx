"use client";

import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/app/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { getRegionTimezone, timezoneOptions } from "@/app/utils/timezoneOptions";
import MatchOfficialSection from "@/app/features/officials/MatchOfficialSection";
import { useMatchesStore } from "@/app/stores/matchStore";
import { clientLogger } from "@/app/utils/clientLogger";
import { Match } from "@/shared/types/db";
import {toast} from "@/app/utils/toast";

interface ManageMatchDialogProps {
    matchId: string;
    scheduledAt: string | null;
    regionCode?: string;
    match: Match;
    onSuccess: () => void;
}

export default function ManageMatchDialog({
                                              matchId,
                                              scheduledAt,
                                              regionCode,
                                              match,
                                              onSuccess
                                          }: ManageMatchDialogProps) {
    const { updateMatchSchedule, voidMatch } = useMatchesStore();

    const [open, setOpen] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [voidDialogOpen, setVoidDialogOpen] = useState(false);
    const [editSchedule, setEditSchedule] = useState<{
        date: string;
        time: string;
        timezone: string;
    } | null>(null);

    const openDialog = () => {
        if (scheduledAt) {
            const tz = regionCode ? getRegionTimezone(regionCode) : "Asia/Singapore";
            const date = new Date(scheduledAt);

            const localDateString = date.toLocaleString('en-US', {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            const parts = localDateString.match(/(\d{2})\/(\d{2})\/(\d{4}),\s(\d{2}):(\d{2})/);

            if (parts) {
                const [, month, day, year, hours, minutes] = parts;

                setEditSchedule({
                    date: `${year}-${month}-${day}`,
                    time: `${hours}:${minutes}`,
                    timezone: tz
                });
            } else {
                setEditSchedule({
                    date: "",
                    time: "",
                    timezone: tz
                });
            }
        } else {
            setEditSchedule({
                date: "",
                time: "",
                timezone: regionCode ? getRegionTimezone(regionCode) : "Asia/Singapore"
            });
        }
        setOpen(true);
    };

    const handleUpdateSchedule = async () => {
        if (!editSchedule?.date || !editSchedule?.time || !editSchedule?.timezone) {
            toast.error("Please fill in all schedule fields");
            return;
        }

        setUpdating(true);
        clientLogger.info("ManageMatchDialog", "Updating match schedule", { matchId });

        const success = await updateMatchSchedule({
            matchId,
            scheduledDate: editSchedule.date,
            scheduledTime: editSchedule.time,
            timezone: editSchedule.timezone,
        });

        if (success) {
            clientLogger.info("ManageMatchDialog", "Schedule updated successfully", { matchId });
            setOpen(false);
            onSuccess();
        } else {
            toast.error("Failed to update schedule");
        }

        setUpdating(false);
    };

    const handleClearSchedule = async () => {
        setUpdating(true);
        clientLogger.info("ManageMatchDialog", "Clearing match schedule", { matchId });

        const success = await updateMatchSchedule({
            matchId,
            scheduledDate: null,
            scheduledTime: null,
            timezone: null,
        });

        if (success) {
            clientLogger.info("ManageMatchDialog", "Schedule cleared successfully", { matchId });
            setOpen(false);
            onSuccess();
        } else {
            toast.error("Failed to clear schedule");
        }

        setUpdating(false);
    };

    const handleVoidMatch = async () => {
        setUpdating(true);
        clientLogger.info("ManageMatchDialog", "Voiding match", { matchId });

        const success = await voidMatch({ matchId });

        if (success) {
            clientLogger.info("ManageMatchDialog", "Match voided successfully", { matchId });
            setVoidDialogOpen(false);
            setOpen(false);
            onSuccess();
        } else {
            toast.error("Failed to void match");
        }

        setUpdating(false);
    };

    const isCompleted = match.status === "completed";

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={openDialog} className="rounded-sm">
                        Manage
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm">
                    <DialogHeader>
                        <DialogTitle>Manage Match</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isCompleted ? "Update schedule for completed match or void match" : "Update schedule and assign officials"}
                        </p>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold">Schedule</h3>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="timezone">Timezone</Label>
                                    <Select
                                        value={editSchedule?.timezone || "Asia/Singapore"}
                                        onValueChange={v => setEditSchedule(prev => ({
                                            date: prev?.date || "",
                                            time: prev?.time || "",
                                            timezone: v
                                        }))}
                                    >
                                        <SelectTrigger id="timezone" className="rounded-sm">
                                            <SelectValue placeholder="Select timezone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timezoneOptions.map(tz => (
                                                <SelectItem key={tz.value} value={tz.value}>
                                                    {tz.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={editSchedule?.date || ""}
                                        onChange={e => setEditSchedule(prev => ({
                                            date: e.target.value,
                                            time: prev?.time || "",
                                            timezone: prev?.timezone || "Asia/Singapore"
                                        }))}
                                        className="rounded-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="time">Time</Label>
                                    <Input
                                        id="time"
                                        type="time"
                                        value={editSchedule?.time || ""}
                                        onChange={e => setEditSchedule(prev => ({
                                            date: prev?.date || "",
                                            time: e.target.value,
                                            timezone: prev?.timezone || "Asia/Singapore"
                                        }))}
                                        className="rounded-sm"
                                    />
                                </div>
                            </div>

                            {scheduledAt && (
                                <Button
                                    variant="outline"
                                    onClick={handleClearSchedule}
                                    disabled={updating}
                                    className="rounded-sm"
                                >
                                    Clear Schedule
                                </Button>
                            )}
                        </div>

                        {/* Always show officials section, not just for non-completed matches */}
                        <div className="space-y-4 pt-4 border-t border-border">
                            <h3 className="font-semibold">Officials</h3>

                            <div className="space-y-4">
                                <MatchOfficialSection
                                    matchId={matchId}
                                    officialType="referee"
                                    title="Referees"
                                />
                                <MatchOfficialSection
                                    matchId={matchId}
                                    officialType="media"
                                    title="Media"
                                />
                            </div>
                        </div>

                        {isCompleted && (
                            <div className="space-y-4 pt-4 border-t border-border border-destructive/20">
                                <h3 className="font-semibold text-destructive">Danger Zone</h3>
                                <p className="text-sm text-muted-foreground">
                                    Voiding a match will reset all scores, remove all officials, clear the schedule, and set the match back to pending status. This action cannot be undone.
                                </p>
                                <Button
                                    variant="destructive"
                                    onClick={() => setVoidDialogOpen(true)}
                                    disabled={updating}
                                    className="rounded-sm"
                                >
                                    Void Match
                                </Button>
                            </div>
                        )}

                        <div className="pt-4 border-t border-border">
                            <Button
                                onClick={handleUpdateSchedule}
                                disabled={!editSchedule?.date || !editSchedule?.time || !editSchedule?.timezone || updating}
                                className="w-full rounded-sm"
                            >
                                {updating ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {match.status === 'completed' && match.match_type !== 'playoffs' && (
                <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
                    <AlertDialogContent className="rounded-sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Void this match?</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div>
                                    <p>This will permanently delete all match data including:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>All set scores and match results</li>
                                        <li>Match MVP and Loser MVP assignments</li>
                                        <li>LVR calculations</li>
                                        <li>All assigned officials (referees and media)</li>
                                        <li>Match schedule</li>
                                    </ul>
                                    <p className="mt-3 font-semibold">The match will be reset to pending status. This action cannot be undone.</p>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleVoidMatch}
                                disabled={updating}
                                className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {updating ? "Voiding..." : "Void Match"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}