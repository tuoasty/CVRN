"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { createTeamAction } from "@/app/actions/team.actions";
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
import { useTeamsStore } from "@/app/stores/teamStore";
import { useRegionsStore } from "@/app/stores/regionStore";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { clientLogger } from "@/app/utils/clientLogger";
import {compressImage} from "@/app/utils/imageCompression";

interface CreateTeamFormProps {
    onSuccess?: () => void;
}

export default function CreateTeamForm({ onSuccess }: CreateTeamFormProps) {
    const { addTeamToCache } = useTeamsStore();
    const { allRegionsCache, fetchAllRegions } = useRegionsStore();
    const { allSeasonsCache, loading: seasonsLoading, fetchAllSeasons } = useSeasonsStore();

    const [name, setName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [seasonId, setSeasonId] = useState("");
    const [brickNumber, setBrickNumber] = useState("");
    const [brickColor, setBrickColor] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [compressing, setCompressing] = useState(false);

    useEffect(() => {
        clientLogger.info('CreateTeamForm', 'Component mounted, fetching data');
        fetchAllRegions();
        fetchAllSeasons();
    }, []);

    const regions = allRegionsCache?.data || [];
    const seasons = allSeasonsCache?.data || [];

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setCompressing(true);
        try {
            const compressed = await compressImage(selected);
            setFile(compressed);
            setPreview(URL.createObjectURL(compressed));
        } catch (err) {
            clientLogger.error("CreateTeamForm", "Image compression failed", { err });
            setError("Failed to process image");
        } finally {
            setCompressing(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (!droppedFile?.type.startsWith("image/")) return;
        setCompressing(true);
        try {
            const compressed = await compressImage(droppedFile);
            setFile(compressed);
            setPreview(URL.createObjectURL(compressed));
        } catch (err) {
            clientLogger.error("CreateTeamForm", "Image compression failed on drop", { err });
            setError("Failed to process image");
        } finally {
            setCompressing(false);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
            if (e.clipboardData.items[i].type.startsWith("image/")) {
                const pastedFile = e.clipboardData.items[i].getAsFile();
                if (!pastedFile) break;
                setCompressing(true);
                try {
                    const compressed = await compressImage(pastedFile);
                    setFile(compressed);
                    setPreview(URL.createObjectURL(compressed));
                } catch (err) {
                    clientLogger.error("CreateTeamForm", "Image compression failed on paste", { err });
                    setError("Failed to process image");
                } finally {
                    setCompressing(false);
                }
                break;
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !file || !seasonId || !brickNumber.trim() || !brickColor.trim()) {
            setError("All fields are required");
            return;
        }

        const brickNum = parseInt(brickNumber.trim(), 10);
        if (isNaN(brickNum) || brickNum < 0) {
            setError("Brick number must be a valid positive number");
            return;
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(brickColor)) {
            setError("Brick color must be in #RRGGBB format (e.g., #FF0000)");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("logo", file);
            formData.append("seasonId", seasonId);
            formData.append("brickNumber", brickNum.toString());
            formData.append("brickColor", brickColor.toUpperCase());

            const result = await createTeamAction(formData);

            if (!result.ok) {
                clientLogger.error('CreateTeamForm', 'Failed to create team', { error: result.error });
                setError(result.error.message);
                return;
            }

            clientLogger.info('CreateTeamForm', 'Team created successfully', { teamId: result.value.id });
            addTeamToCache(result.value);

            setSuccess("Team created successfully!");

            setName("");
            setFile(null);
            setSeasonId("");
            setPreview(null);
            setBrickNumber("");
            setBrickColor("");

            if (onSuccess) {
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }

        } catch (error) {
            clientLogger.error('CreateTeamForm', 'Exception during team creation', { error });
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const seasonsByRegion = seasons.reduce((acc, season) => {
        const regionId = season.region_id;
        if (!acc[regionId]) {
            acc[regionId] = [];
        }
        acc[regionId].push(season);
        return acc;
    }, {} as Record<string, typeof seasons>);

    return (
        <div className="space-y-6">
            <div>
                <h2>Create New Team</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Add a new team to the league system
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <Label htmlFor="name">Team Name</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="Team name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading || compressing}
                            className="rounded-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="season">Season</Label>
                        <Select value={seasonId} onValueChange={setSeasonId} disabled={loading || seasonsLoading}>
                            <SelectTrigger className="rounded-sm">
                                <SelectValue placeholder="Select season" />
                            </SelectTrigger>
                            <SelectContent>
                                {regions.map((region) => {
                                    const regionSeasons = seasonsByRegion[region.id] || [];
                                    if (regionSeasons.length === 0) return null;

                                    return (
                                        <React.Fragment key={region.id}>
                                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                                {region.code.toUpperCase()} - {region.name}
                                            </div>
                                            {regionSeasons.map((season) => (
                                                <SelectItem key={season.id} value={season.id}>
                                                    {season.name}
                                                </SelectItem>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="logo">Team Logo</Label>
                    <div
                        className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors ${
                            isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25"
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onPaste={handlePaste}
                        tabIndex={0}
                    >
                        {preview ? (
                            <div className="space-y-3">
                                <div className="relative w-32 h-32 mx-auto">
                                    <Image
                                        src={preview}
                                        alt="Logo Preview"
                                        fill
                                        sizes="128px"
                                        className="object-contain"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setFile(null);
                                        setPreview(null);
                                    }}
                                    className="rounded-sm"
                                >
                                    Remove
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    {compressing ? "Processing image..." : "Drag & drop, paste, or click to upload"}
                                </p>
                                <Input
                                    id="logo"
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

                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <Label htmlFor="brickNumber">Brick Number</Label>
                        <Input
                            id="brickNumber"
                            type="text"
                            placeholder="e.g., 1, 21, 1032"
                            value={brickNumber}
                            onChange={(e) => setBrickNumber(e.target.value)}
                            disabled={loading}
                            className="rounded-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="brickColor">Brick Color (Hex)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="brickColor"
                                type="text"
                                placeholder="#FF0000"
                                value={brickColor}
                                onChange={(e) => setBrickColor(e.target.value)}
                                disabled={loading}
                                maxLength={7}
                                className="rounded-sm flex-1"
                            />
                            {brickColor && /^#[0-9A-Fa-f]{6}$/.test(brickColor) && (
                                <div
                                    className="w-10 h-10 rounded-sm border border-border shrink-0"
                                    style={{ backgroundColor: brickColor }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-sm p-3">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-primary/10 border border-primary/20 rounded-sm p-3">
                        <p className="text-sm text-primary">{success}</p>
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <Button
                        type="submit"
                        disabled={loading || seasonsLoading || compressing}
                        className="rounded-sm"
                    >
                        {loading ? "Creating..." : "Create Team"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setName("");
                            setFile(null);
                            setSeasonId("");
                            setPreview(null);
                            setBrickNumber("");
                            setBrickColor("");
                            setError(null);
                            setSuccess(null);
                        }}
                        disabled={loading}
                        className="rounded-sm"
                    >
                        Reset
                    </Button>
                </div>
            </form>
        </div>
    );
}