"use client";

import React, { useState } from "react";
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
import { Button } from "@/app/components/ui/button";
import { Trash2 } from "lucide-react";
import { useMatchesStore } from "@/app/stores/matchStore";
import { toast } from "@/app/utils/toast";
import { clientLogger } from "@/app/utils/clientLogger";

interface DeleteMatchDialogProps {
    matchId: string;
    onSuccess?: () => void;
}

export default function DeleteMatchDialog({ matchId, onSuccess }: DeleteMatchDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { deleteMatch } = useMatchesStore();

    const handleDelete = async () => {
        setLoading(true);

        try {
            const success = await deleteMatch(matchId);

            if (success) {
                toast.success("Match deleted", "The match has been removed from the schedule");
                setOpen(false);
                onSuccess?.();
            } else {
                toast.error("Failed to delete match", "Please try again");
            }
        } catch (error) {
            clientLogger.error("DeleteMatchDialog", "Error deleting match", { matchId, error });
            toast.error("Failed to delete match", "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Match</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this match? This action cannot be undone.
                        All associated data (sets, officials) will be permanently removed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {loading ? "Deleting..." : "Delete Match"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}