"use client";

import { Card, CardContent } from "@/app/components/ui/card";
import Image from "next/image";
import { PlayerWithRole } from "@/server/domains/player";
import { Button } from "@/app/components/ui/button";
import { useState } from "react";
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
import { transferCaptainAction, setPlayerRoleAction } from "@/app/actions/player.actions";
import { toast } from "@/app/utils/toast";

interface Props {
    role: 'captain' | 'vice_captain' | 'court_captain';
    player: PlayerWithRole | null;
    gradientFrom: string;
    gradientTo: string;
    teamId: string;
    seasonId: string;
    onRoleChanged: () => void;
    allPlayers: PlayerWithRole[];
    canPromoteToCaptain: boolean;
}

const roleLabels = {
    captain: 'Captain',
    vice_captain: 'Vice Captain',
    court_captain: 'Court Captain'
};

const emptyLabels = {
    captain: 'No Captain Assigned',
    vice_captain: 'No Vice Captain Assigned',
    court_captain: 'No Court Captain Assigned'
};

export default function CaptainSlotCard({
                                            role,
                                            player,
                                            gradientFrom,
                                            gradientTo,
                                            teamId,
                                            seasonId,
                                            onRoleChanged,
                                            allPlayers,
                                            canPromoteToCaptain
                                        }: Props) {
    const [updating, setUpdating] = useState(false);
    const [showTransferConfirm, setShowTransferConfirm] = useState(false);
    const [selectedNewCaptain, setSelectedNewCaptain] = useState<string | null>(null);

    const gradientStyle = {
        background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`
    };

    const handleTransferCaptain = async () => {
        if (!selectedNewCaptain || !player) return;

        setUpdating(true);

        const result = await transferCaptainAction({
            currentCaptainPlayerId: player.id,
            newCaptainPlayerId: selectedNewCaptain,
            teamId: teamId,
            seasonId: seasonId,
        });

        if (!result.ok) {
            toast.error(result.error.message);
            setUpdating(false);
            return;
        }

        toast.success("Captain transferred successfully");
        setShowTransferConfirm(false);
        setSelectedNewCaptain(null);
        setUpdating(false);
        onRoleChanged();
    };

    const handleDemote = async () => {
        if (!player) return;

        setUpdating(true);

        const result = await setPlayerRoleAction({
            playerId: player.id,
            teamId: teamId,
            seasonId: seasonId,
            role: 'player',
        });

        if (!result.ok) {
            toast.error(result.error.message);
            setUpdating(false);
            return;
        }

        toast.success("Player demoted successfully");
        setUpdating(false);
        onRoleChanged();
    };

    const handlePromoteToCaptain = async () => {
        if (!player) return;

        setUpdating(true);

        const result = await setPlayerRoleAction({
            playerId: player.id,
            teamId: teamId,
            seasonId: seasonId,
            role: 'captain',
        });

        if (!result.ok) {
            toast.error(result.error.message);
            setUpdating(false);
            return;
        }

        toast.success("Promoted to Captain successfully");
        setUpdating(false);
        onRoleChanged();
    };

    const eligibleForCaptainTransfer = allPlayers.filter(p => p.id !== player?.id);
    const isCaptain = role === 'captain';
    const isViceCaptain = role === 'vice_captain';
    const isCourtCaptain = role === 'court_captain';

    if (!player) {
        return (
            <Card className="rounded-sm border-dashed h-[280px]">
                <CardContent className="p-4 h-full">
                    <div className="flex flex-col items-center text-center justify-center h-full space-y-3">
                        <div className="w-20 h-20 rounded-sm border-2 border-dashed border-border bg-muted" />
                        <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                                {roleLabels[role]}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {emptyLabels[role]}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-sm overflow-hidden border-4 h-[280px]" style={{ borderColor: gradientFrom + '40' }}>
            <div className="h-1.5" style={gradientStyle} />
            <CardContent className="p-4">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: gradientFrom }}>
                        {roleLabels[role]}
                    </div>

                    {player.avatar_url && (
                        <div className="relative w-20 h-20 rounded-sm overflow-hidden border-2 border-border">
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
                        {isCaptain && (
                            <AlertDialog open={showTransferConfirm} onOpenChange={setShowTransferConfirm}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full rounded-sm"
                                        disabled={updating || eligibleForCaptainTransfer.length === 0}
                                    >
                                        Transfer Captain
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-sm">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Transfer Captain Role</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Select a player to become the new captain. {player.display_name || player.username} will become a regular player.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {eligibleForCaptainTransfer.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedNewCaptain(p.id)}
                                                className={`w-full p-3 rounded-sm border text-left transition-colors ${
                                                    selectedNewCaptain === p.id
                                                        ? 'border-primary bg-primary/10'
                                                        : 'border-border hover:border-primary/50'
                                                }`}
                                            >
                                                <div className="font-medium">{p.display_name || p.username}</div>
                                                <div className="text-xs text-muted-foreground">@{p.username}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleTransferCaptain}
                                            disabled={!selectedNewCaptain || updating}
                                            className="rounded-sm"
                                        >
                                            {updating ? "Transferring..." : "Transfer"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}

                        {(isViceCaptain || isCourtCaptain) && canPromoteToCaptain && (
                            <Button
                                onClick={handlePromoteToCaptain}
                                variant="outline"
                                size="sm"
                                className="w-full rounded-sm"
                                disabled={updating}
                            >
                                Promote to Captain
                            </Button>
                        )}

                        {(isViceCaptain || isCourtCaptain) && (
                            <Button
                                onClick={handleDemote}
                                variant="outline"
                                size="sm"
                                className="w-full rounded-sm"
                                disabled={updating}
                            >
                                Demote
                            </Button>
                        )}

                        {!isCaptain && !isViceCaptain && !isCourtCaptain && (
                            <div className="h-8" />
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}