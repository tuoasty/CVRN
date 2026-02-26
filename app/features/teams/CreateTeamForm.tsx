"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { createTeamAction } from "@/app/actions/team.actions";
import { getAllRegionsAction } from "@/app/actions/region.actions";
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
import { Region } from "@/shared/types/db";
import {useTeamsStore} from "@/app/stores/teamStore";

export default function CreateTeamForm() {
    const { addTeamToCache } = useTeamsStore();

    const [name, setName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [regionId, setRegionId] = useState("");
    const [regions, setRegions] = useState<Region[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        async function loadRegions() {
            const result = await getAllRegionsAction();
            if (result.ok) {
                setRegions(result.value);
            }
        }
        loadRegions();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];

        if (!selected) return;

        setFile(selected);
        setPreview(URL.createObjectURL(selected));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type.startsWith("image/")) {
            setFile(droppedFile);
            setPreview(URL.createObjectURL(droppedFile));
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith("image/")) {
                const pastedFile = items[i].getAsFile();
                if (pastedFile) {
                    setFile(pastedFile);
                    setPreview(URL.createObjectURL(pastedFile));
                }
                break;
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !file || !regionId) {
            setError("Team name, logo and region are required");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("logo", file);
            formData.append("regionId", regionId);

            const result = await createTeamAction(formData);

            if (!result.ok) {
                setError(result.error.message);
                return;
            }

            addTeamToCache(result.value);

            setSuccess("Team created successfully!");

            setName("");
            setFile(null);
            setRegionId("");
            setPreview(null);

        } catch (error) {
            console.log(error)
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create New Team</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">Team Name</Label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Team name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div>
                    <Label htmlFor="logo">Team Logo</Label>
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                            isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25"
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onPaste={handlePaste}
                        tabIndex={0}
                    >
                        {preview ? (
                            <Image
                                src={preview}
                                alt="Logo Preview"
                                width={150}
                                height={150}
                                className="mx-auto"
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Drag & drop, paste, or click to upload
                            </p>
                        )}
                        <Input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={loading}
                            className="mt-2"
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="region">Region</Label>
                    <Select value={regionId} onValueChange={setRegionId} disabled={loading}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                            {regions.map((region) => (
                                <SelectItem key={region.id} value={region.id}>
                                    {region.code} - {region.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Team"}
                </Button>
            </form>

            {error && <div className="text-red-600 mt-2">{error}</div>}
            {success && <div className="text-green-600 mt-2">{success}</div>}
        </div>
    );
}