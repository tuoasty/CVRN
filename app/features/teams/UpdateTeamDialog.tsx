"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/app/components/ui/dialog";
import { updateTeamAction } from "@/app/actions/team.actions";
import { mutateAllTeams } from "@/app/hooks/useTeams";
import { clientLogger } from "@/app/utils/clientLogger";
import { compressImage } from "@/app/utils/imageCompression";
import { TeamWithRegion } from "@/server/dto/team.dto";
import { toast } from "@/app/utils/toast";
import { Pencil } from "lucide-react";

interface UpdateTeamDialogProps {
    team: TeamWithRegion;
    onSuccess?: () => void;
}

export default function UpdateTeamDialog({ team, onSuccess }: UpdateTeamDialogProps) {


    const [open, setOpen] = useState(false);
    const [name, setName] = useState(team.name);
    const [brickNumber, setBrickNumber] = useState(team.brick_number.toString());
    const [brickColor, setBrickColor] = useState(team.brick_color);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(team.logo_url);
    const [isDragging, setIsDragging] = useState(false);
    const [compressing, setCompressing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [startingLvr, setStartingLvr] = useState(team.starting_lvr.toString());

    const resetForm = () => {
        setName(team.name);
        setBrickNumber(team.brick_number.toString());
        setBrickColor(team.brick_color);
        setFile(null);
        setPreview(team.logo_url);
        setStartingLvr(team.starting_lvr.toString());
    };

    const handleOpenChange = (val: boolean) => {
        setOpen(val);
        if (!val) resetForm();
    };

    const processFile = async (raw: File) => {
        setCompressing(true);
        try {
            const compressed = await compressImage(raw);
            setFile(compressed);
            setPreview(URL.createObjectURL(compressed));
        } catch (err) {
            clientLogger.error("UpdateTeamDialog", "Image compression failed", { err });
            toast.error("Failed to process image");
        } finally {
            setCompressing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) processFile(selected);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped?.type.startsWith("image/")) processFile(dropped);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
            if (e.clipboardData.items[i].type.startsWith("image/")) {
                const pasted = e.clipboardData.items[i].getAsFile();
                if (pasted) { processFile(pasted); break; }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !brickNumber.trim() || !brickColor.trim()) {
            toast.error("All fields are required");
            return;
        }

        const brickNum = parseInt(brickNumber.trim(), 10);
        if (isNaN(brickNum) || brickNum < 0) {
            toast.error("Brick number must be a valid positive number");
            return;
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(brickColor)) {
            toast.error("Brick color must be in #RRGGBB format");
            return;
        }

        const lvrVal = parseFloat(startingLvr);
        if (isNaN(lvrVal)) {
            toast.error("Starting LVR must be a valid number");
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("teamId", team.id);
            formData.append("name", name.trim());
            formData.append("brickNumber", brickNum.toString());
            formData.append("brickColor", brickColor.toUpperCase());
            if (file) formData.append("logo", file);
            formData.append("startingLvr", lvrVal.toString());

            const result = await updateTeamAction(formData);

            if (!result.ok) {
                clientLogger.error("UpdateTeamDialog", "Failed to update team", { error: result.error });
                toast.error("Failed to update team", result.error.message);
                return;
            }

            await mutateAllTeams();
            toast.success("Team updated successfully");
            setOpen(false);
            onSuccess?.();
        } catch (err) {
            clientLogger.error("UpdateTeamDialog", "Exception updating team", { err });
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-sm">
                    <Pencil className="h-4 w-4 mr-2" /> Edit Team
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] !max-w-lg max-h-[90vh] overflow-y-auto rounded-sm">
                <DialogHeader>
                    <DialogTitle>Edit Team</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Update team details. Season cannot be changed.
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                    <div className="space-y-2">
                        <Label htmlFor="update-name">Team Name</Label>
                        <Input
                            id="update-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading || compressing}
                            className="rounded-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Team Logo</Label>
                        <div
                            className={`border-2 border-dashed rounded-sm p-4 text-center transition-colors ${
                                isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25"
                            }`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={handleDrop}
                            onPaste={handlePaste}
                            tabIndex={0}
                        >
                            {preview ? (
                                <div className="space-y-3">
                                    <div className="relative w-24 h-24 mx-auto">
                                        <Image src={preview} alt="Logo preview" fill sizes="96px" className="object-contain" />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { setFile(null); setPreview(null); }}
                                        className="rounded-sm"
                                    >
                                        Change Logo
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        {compressing ? "Processing image..." : "Drag & drop, paste, or click to upload"}
                                    </p>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        disabled={loading}
                                        className="rounded-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="update-brick-number">Brick Number</Label>
                            <Input
                                id="update-brick-number"
                                value={brickNumber}
                                onChange={(e) => setBrickNumber(e.target.value)}
                                disabled={loading}
                                className="rounded-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="update-brick-color">Brick Color (Hex)</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="update-brick-color"
                                    value={brickColor}
                                    onChange={(e) => setBrickColor(e.target.value)}
                                    disabled={loading}
                                    maxLength={7}
                                    className="rounded-sm flex-1"
                                />
                                {/^#[0-9A-Fa-f]{6}$/.test(brickColor) && (
                                    <div
                                        className="w-10 h-10 rounded-sm border border-border shrink-0"
                                        style={{ backgroundColor: brickColor }}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="update-starting-lvr">Starting LVR</Label>
                            <Input
                                id="update-starting-lvr"
                                type="number"
                                step="0.1"
                                value={startingLvr}
                                onChange={(e) => setStartingLvr(e.target.value)}
                                disabled={loading}
                                className="rounded-sm"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <Button type="submit" disabled={loading || compressing} className="rounded-sm">
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={loading}
                            className="rounded-sm"
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}