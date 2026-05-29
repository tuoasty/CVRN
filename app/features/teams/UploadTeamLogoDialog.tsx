"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/app/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/app/components/ui/dialog";
import { uploadTeamLogoAction } from "@/app/actions/team.actions";
import { mutateAllTeams } from "@/app/hooks/useTeams";
import { clientLogger } from "@/app/utils/clientLogger";
import { compressImage } from "@/app/utils/imageCompression";
import { toast } from "@/app/utils/toast";
import { errorCodeToUserMessage } from "@/app/lib/errorMessages";
import { Upload } from "lucide-react";

interface UploadTeamLogoDialogProps {
    teamId: string;
    teamName: string;
    currentLogoUrl: string | null;
    trigger: React.ReactNode;
    onSuccess?: (logoUrl: string) => void;
}

export default function UploadTeamLogoDialog({
    teamId,
    teamName,
    currentLogoUrl,
    trigger,
    onSuccess,
}: UploadTeamLogoDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(currentLogoUrl);
    const [isDragging, setIsDragging] = useState(false);
    const [compressing, setCompressing] = useState(false);
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
        setFile(null);
        setPreview(currentLogoUrl);
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
            clientLogger.error("UploadTeamLogoDialog", "Image compression failed", { err });
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
        if (!file) {
            toast.error("Please select an image first");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("logo", file);

            const result = await uploadTeamLogoAction(teamId, formData);

            if (!result.ok) {
                clientLogger.error("UploadTeamLogoDialog", "Logo upload failed", { error: result.error });
                toast.error(errorCodeToUserMessage(result.error.code), result.error.message);
                return;
            }

            await mutateAllTeams();
            toast.success("Logo uploaded successfully");
            onSuccess?.(result.value.logoUrl);
            setOpen(false);
        } catch (err) {
            clientLogger.error("UploadTeamLogoDialog", "Exception uploading logo", { err });
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="rounded-sm max-w-sm">
                <DialogHeader>
                    <DialogTitle>Upload Logo — {teamName}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-4">
                    <div
                        className={`border-2 border-dashed rounded-sm p-4 text-center transition-colors cursor-pointer ${
                            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById(`logo-upload-${teamId}`)?.click()}
                    >
                        {preview ? (
                            <div className="flex items-center justify-center">
                                <div className="relative w-20 h-20">
                                    <Image
                                        src={preview}
                                        alt={teamName}
                                        fill
                                        sizes="80px"
                                        className="object-contain"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="py-4 text-muted-foreground text-sm">
                                <Upload className="mx-auto mb-2 h-6 w-6" />
                                <p>Drag & drop, paste, or click to select</p>
                                <p className="text-xs mt-1">PNG, JPG, WebP — max 2MB</p>
                            </div>
                        )}
                        {compressing && (
                            <p className="text-xs text-muted-foreground mt-2">Processing…</p>
                        )}
                    </div>

                    <input
                        id={`logo-upload-${teamId}`}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <div className="flex gap-2 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-sm"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-sm"
                            disabled={!file || loading || compressing}
                        >
                            {loading ? "Uploading…" : "Upload"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
