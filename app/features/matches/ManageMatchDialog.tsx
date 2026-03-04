"use client";

import React, {useState} from "react";
import {Button} from "@/app/components/ui/button";
import {Input} from "@/app/components/ui/input";
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
import {getRegionTimezone, timezoneOptions} from "@/app/utils/timezoneOptions";
import MatchOfficialSection from "@/app/features/officials/MatchOfficialSection";
import {useMatchesStore} from "@/app/stores/matchStore";
import {clientLogger} from "@/app/utils/clientLogger";

interface ManageMatchDialogProps {
    matchId: string;
    scheduledAt: string | null;
    regionCode?: string;
    onSuccess: () => void;
}

export default function ManageMatchDialog({
                                              matchId,
                                              scheduledAt,
                                              regionCode,
                                              onSuccess
                                          }: ManageMatchDialogProps) {
    const {updateMatchSchedule} = useMatchesStore();

    const [open, setOpen] = useState(false);
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
                timezone: regionCode ? getRegionTimezone(regionCode) : ""
            });
        }
        setOpen(true);
    };

    const handleUpdateSchedule = async () => {
        if (!editSchedule?.date || !editSchedule?.time || !editSchedule?.timezone) {
            alert("Please fill in all schedule fields");
            return;
        }

        clientLogger.info("ManageMatchDialog", "Updating match schedule", {matchId});

        const success = await updateMatchSchedule({
            matchId,
            scheduledDate: editSchedule.date,
            scheduledTime: editSchedule.time,
            timezone: editSchedule.timezone,
        });

        if (success) {
            clientLogger.info("ManageMatchDialog", "Schedule updated successfully", {matchId});
            setOpen(false);
            onSuccess();
        } else {
            alert("Failed to update schedule");
        }
    };

    const handleClearSchedule = async () => {
        clientLogger.info("ManageMatchDialog", "Clearing match schedule", {matchId});

        const success = await updateMatchSchedule({
            matchId,
            scheduledDate: null,
            scheduledTime: null,
            timezone: null,
        });

        if (success) {
            clientLogger.info("ManageMatchDialog", "Schedule cleared successfully", {matchId});
            setOpen(false);
            onSuccess();
        } else {
            alert("Failed to clear schedule");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={openDialog}>
                    Manage
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Match</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Timezone</label>
                        <Select
                            value={editSchedule?.timezone || "Asia/Singapore"}
                            onValueChange={v => setEditSchedule(prev => ({
                                date: prev?.date || "",
                                time: prev?.time || "",
                                timezone: v
                            }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select timezone"/>
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

                    <div>
                        <label className="block text-sm font-medium mb-2">Date</label>
                        <Input
                            type="date"
                            value={editSchedule?.date || ""}
                            onChange={e => setEditSchedule(prev => ({
                                date: e.target.value,
                                time: prev?.time || "",
                                timezone: prev?.timezone || ""
                            }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Time</label>
                        <Input
                            type="time"
                            value={editSchedule?.time || ""}
                            onChange={e => setEditSchedule(prev => ({
                                date: prev?.date || "",
                                time: e.target.value,
                                timezone: prev?.timezone || ""
                            }))}
                        />
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-semibold mb-4">Officials</h3>
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

                    <div className="flex gap-2">
                        <Button
                            onClick={handleUpdateSchedule}
                            disabled={!editSchedule?.date || !editSchedule?.time || !editSchedule?.timezone}
                            className="flex-1"
                        >
                            Update Schedule
                        </Button>

                        {scheduledAt && (
                            <Button
                                variant="outline"
                                onClick={handleClearSchedule}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}