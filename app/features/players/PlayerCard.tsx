"use client";

import Image from "next/image";
import { useState } from "react";
import { Player } from "@/shared/types/db";
import { removePlayerFromTeamAction } from "@/app/actions/player.actions";
import { Card, CardContent } from "@/app/components/ui/card";
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

interface Props {
    player: Player;
    seasonId: string;
    onRemoved: () => void;
}

export default function PlayerCard({ player, seasonId, onRemoved }: Props) {
    const [removing, setRemoving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleRemove = async () => {
        setRemoving(true);
        setError(null);

        const result = await removePlayerFromTeamAction({
            playerId: player.id,
            seasonId: seasonId,
        });

        if (!result.ok) {
            setError(result.error.message);
            setRemoving(false);
            return;
        }

        setShowConfirm(false);
        onRemoved();
    };

    return (
        <Card className="rounded-sm hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
                <div className="flex flex-col items-center text-center space-y-3">
                    {player.avatar_url && (
                        <div className="relative w-20 h-20 rounded-sm overflow-hidden border border-border">
                            <Image
                                src={player.avatar_url}
                                alt={player.username || ""}
                                fill
                                sizes="80px"
                                className="object-cover"
                            />
                        </div>
                    )}

                    <div className="w-full">
                        <h4 className="font-semibold text-sm truncate">
                            {player.display_name || player.username}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                            @{player.username}
                        </p>
                    </div>

                    {error && (
                        <div className="w-full bg-destructive/10 border border-destructive/20 rounded-sm p-2">
                            <p className="text-xs text-destructive">{error}</p>
                        </div>
                    )}

                    <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full rounded-sm text-destructive hover:text-destructive"
                                disabled={removing}
                            >
                                Remove
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-sm">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Remove Player?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Remove {player.display_name || player.username} from this team?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleRemove}
                                    disabled={removing}
                                    className="rounded-sm"
                                >
                                    {removing ? "Removing..." : "Remove"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
}