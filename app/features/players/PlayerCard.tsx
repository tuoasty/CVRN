"use client";

import Image from "next/image";
import { useState } from "react";
import { removePlayerFromTeamAction, setPlayerRoleAction } from "@/app/actions/player.actions";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { toast } from "@/app/utils/toast";
import { PlayerRole, PlayerWithRole } from "@/server/dto/player.dto";

interface Props {
    player: PlayerWithRole;
    teamId: string;
    seasonId: string;
    onRoleChanged: () => void;
    onRemoved: (playerId: string) => void;
    availableRoles: {
        captain: boolean;
        viceCaptain: boolean;
        courtCaptain: boolean;
    };
}

export default function PlayerCard({
                                       player,
                                       teamId,
                                       seasonId,
                                       onRoleChanged,
                                       onRemoved,
                                       availableRoles
                                   }: Props) {
    const [removing, setRemoving] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

    const handleRemove = async () => {
        setRemoving(true);

        const result = await removePlayerFromTeamAction({
            playerId: player.id,
            seasonId: seasonId,
        });

        if (!result.ok) {
            toast.error(result.error.message);
            setRemoving(false);
            return;
        }

        toast.success("Player removed successfully");
        setShowRemoveConfirm(false);
        onRemoved(player.id);
    };

    const handlePromote = async (newRole: PlayerRole) => {
        setUpdating(true);

        const result = await setPlayerRoleAction({
            playerId: player.id,
            teamId: teamId,
            seasonId: seasonId,
            role: newRole,
        });

        if (!result.ok) {
            toast.error(result.error.message);
            setUpdating(false);
            return;
        }

        toast.success("Role updated successfully");
        setUpdating(false);
        onRoleChanged();
    };

    const hasAvailablePromotions = availableRoles.captain || availableRoles.viceCaptain || availableRoles.courtCaptain;

    return (
        <Card className="rounded-sm hover:border-primary/50 transition-colors h-[280px]">
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

                    <div className="w-full space-y-2">
                        {hasAvailablePromotions && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full rounded-sm"
                                        disabled={updating}
                                    >
                                        Promote To
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="rounded-sm">
                                    {availableRoles.captain && (
                                        <DropdownMenuItem onClick={() => handlePromote('captain')}>
                                            Captain
                                        </DropdownMenuItem>
                                    )}
                                    {availableRoles.viceCaptain && (
                                        <DropdownMenuItem onClick={() => handlePromote('vice_captain')}>
                                            Vice Captain
                                        </DropdownMenuItem>
                                    )}
                                    {availableRoles.courtCaptain && (
                                        <DropdownMenuItem onClick={() => handlePromote('court_captain')}>
                                            Court Captain
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full rounded-sm text-destructive hover:text-destructive"
                                    disabled={removing || updating}
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

                        {!hasAvailablePromotions && <div className="h-8" />}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}