"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

import AddPlayerToTeam from "@/app/features/players/AddPlayerToTeam";
import { deleteTeamAction } from "@/app/actions/team.actions";
import PlayerCard from "@/app/features/players/PlayerCard";

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
import { Skeleton } from "@/app/components/ui/skeleton";
import { clientLogger } from "@/app/utils/clientLogger";
import { useTeamWithPlayers, mutateAllTeams } from "@/app/hooks/useTeams";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import CaptainSlotCard from "@/app/features/players/CaptainSlotCard";
import { Card, CardContent } from "@/app/components/ui/card";
import { getLogoClassName } from "@/app/lib/logoClass";
import UpdateTeamDialog from "@/app/features/teams/UpdateTeamDialog";
import { useTeamNameHistory } from "@/app/hooks/useTeamNameHistory";

type TeamDetailPageProps = {
    regionCode: string;
    seasonSlug: string;
    teamSlug: string;
};

export default function TeamDetailPage({
                                           regionCode: regionCodeProp,
                                           seasonSlug: seasonSlugProp,
                                           teamSlug: teamSlugProp
                                       }: TeamDetailPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const addFormRef = useRef<HTMLDivElement>(null);

    const backHrefs = useMemo(() => {
        const build = (keys: string[]) => {
            const params = new URLSearchParams();
            for (const key of keys) {
                const value = searchParams.get(key);
                if (value) params.set(key, value);
            }
            const query = params.toString();
            return query ? `/admin/teams?${query}` : "/admin/teams";
        };
        return {

            afterDelete: build(["region", "season"]),
            back: build(["region", "season", "q"]),
        };
    }, [searchParams]);

    const regionCode = safeDecodeURIComponent(regionCodeProp).toLowerCase();
    const seasonSlug = safeDecodeURIComponent(seasonSlugProp).toLowerCase();
    const teamSlug = safeDecodeURIComponent(teamSlugProp).toLowerCase();

    const [showAddForm, setShowAddForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        team: teamData,
        players,
        isLoading: teamLoading,
        error: teamError,
        mutate: mutateTeam,
    } = useTeamWithPlayers(teamSlug, seasonSlug, regionCode);

    const { history: nameHistory } = useTeamNameHistory(teamData?.id ?? null);

    const captain = players.find(p => p.role === 'captain') ?? null;
    const viceCaptain = players.find(p => p.role === 'vice_captain') ?? null;
    const courtCaptain = players.find(p => p.role === 'court_captain') ?? null;
    const regularPlayers = players.filter(p => p.role === 'player');

    const handleOpenAddForm = () => {
        setShowAddForm(true);
        setTimeout(() => {
            addFormRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 100);
    };

    const handlePlayerAdded = () => {
        mutateTeam();
    };

    const handlePlayerRemoved = () => {
        mutateTeam();
    };

    const handleDeleteTeam = async () => {
        if (!teamData?.id) return;

        const result = await deleteTeamAction({ teamId: teamData.id });

        if (!result.ok) {
            clientLogger.error('TeamDetailPage', 'Failed to delete team', { teamId: teamData.id, error: result.error });
            setError(result.error.message);
            return;
        }

        await mutateAllTeams();
        router.push(backHrefs.afterDelete);
    };

    const handleRoleChanged = () => {
        mutateTeam();
    };

    const handleTeamUpdated = () => {
        mutateTeam();
        mutateAllTeams();
    };

    const isLoading = teamLoading;
    const displayError = error || teamError;

    if (isLoading && !teamData) {
        return (
            <div className="admin-container">
                <div className="admin-section">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-24 rounded-sm" />
                            <Skeleton className="h-7 w-48 rounded-sm" />
                            <Skeleton className="h-4 w-36 rounded-sm" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-20 rounded-sm" />
                            <Skeleton className="h-9 w-20 rounded-sm" />
                        </div>
                    </div>
                    <div className="panel p-6">
                        <div className="flex items-center gap-6">
                            <Skeleton className="h-24 w-24 rounded-sm shrink-0" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-6 w-48 rounded-sm" />
                                <Skeleton className="h-4 w-32 rounded-sm" />
                                <Skeleton className="h-4 w-24 rounded-sm" />
                            </div>
                        </div>
                    </div>
                    <div className="panel overflow-hidden">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
                                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                                <Skeleton className="h-4 w-32 rounded-sm" />
                                <Skeleton className="h-4 w-16 rounded-sm ml-auto" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (displayError) {
        return (
            <div className="admin-container">
                <div className="panel p-6">
                    <p className="text-destructive">{displayError}</p>
                </div>
            </div>
        );
    }

    if (!teamData) {
        return (
            <div className="admin-container">
                <div className="panel p-6">
                    <p className="text-muted-foreground">Team not found</p>
                </div>
            </div>
        );
    }

    const regionName = teamData.seasons?.regions?.name || "Unknown Region";
    const regionCodeDisplay = teamData.seasons?.regions?.code?.toUpperCase() || "??";
    const seasonName = teamData.seasons?.name || "Unknown Season";
    const maxPlayers = teamData.seasons?.max_players ?? 18;

    const availableRoles = {
        captain: !captain,
        viceCaptain: !viceCaptain,
        courtCaptain: !courtCaptain,
    };

    return (
        <div className="admin-container">
        <div className="admin-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(backHrefs.back)}
                            className="rounded-sm -ml-2"
                        >
                            ← Back to Teams
                        </Button>
                    </div>
                    <h1>{teamData.name}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-mono font-semibold">{regionCodeDisplay}</span> - {regionName} / {seasonName}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={showAddForm ? "secondary" : "default"}
                        onClick={handleOpenAddForm}
                        className="rounded-sm"
                        disabled={players.length >= maxPlayers}
                    >
                        {showAddForm ? "Adding Player" : "Add Player"}
                    </Button>

                    <UpdateTeamDialog team={teamData} onSuccess={handleTeamUpdated} />

                    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="rounded-sm">
                                Delete Team
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-sm">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete {teamData.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. All players will be removed from this team.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteTeam} className="rounded-sm">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <div className="panel p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                    {teamData.logo_url && (
                        <div className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 mx-auto sm:mx-0">
                            <Image
                                src={teamData.logo_url}
                                alt={teamData.name || ""}
                                fill
                                sizes="(max-width: 640px) 96px, 128px"
                                className={getLogoClassName(teamData.logo_bg_removed ?? false)}
                            />
                        </div>
                    )}
                    <div className="space-y-3 w-full min-w-0">
                        <div>
                            <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                                Team Name
                            </div>
                            <div className="text-xl font-semibold">{teamData.name}</div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                            <div>
                                <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                                    Brick Number
                                </div>
                                <div className="font-mono font-semibold">{teamData.brick_number ? teamData.brick_number : "-" }</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                                    Brick Color
                                </div>
                                <div className="flex items-center gap-2">
                                    {teamData.brick_color && (
                                        <div
                                            className="w-6 h-6 rounded-sm border border-border"
                                            style={{ backgroundColor: teamData.brick_color }}
                                        />
                                    )}
                                    <span className="font-mono text-sm">{teamData.brick_color}</span>
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                                    Total Players
                                </div>
                                <div className="font-semibold">{players.length} / {maxPlayers}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showAddForm && (
                <div ref={addFormRef} className="panel p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3>Add Player</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Search for a player to add to the team
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddForm(false)}
                            className="rounded-sm"
                        >
                            ✕
                        </Button>
                    </div>
                    <AddPlayerToTeam teamId={teamData.id} seasonId={teamData.season_id} onSuccess={handlePlayerAdded} />
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2>Team Roster</h2>
                    <span className="text-sm text-muted-foreground">
                        {players.length} / {maxPlayers} {players.length === 1 ? 'player' : 'players'}
                    </span>
                </div>

                {players.length === 0 ? (
                    <div className="panel p-8">
                        <p className="text-muted-foreground text-center">
                            No players in this team yet. Click &quot;Add Player&quot; to get started.
                        </p>
                    </div>
                ) : (
                    <>
                        <div>
                            <h3 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">Leadership</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <CaptainSlotCard
                                    role="captain"
                                    player={captain}
                                    gradientFrom="#9e6bff"
                                    gradientTo="#9fc1ff"
                                    teamId={teamData.id}
                                    seasonId={teamData.season_id}
                                    onRoleChanged={handleRoleChanged}
                                    allPlayers={players}
                                    canPromoteToCaptain={availableRoles.captain}
                                />
                                <CaptainSlotCard
                                    role="vice_captain"
                                    player={viceCaptain}
                                    gradientFrom="#aea287"
                                    gradientTo="#f1f7ff"
                                    teamId={teamData.id}
                                    seasonId={teamData.season_id}
                                    onRoleChanged={handleRoleChanged}
                                    allPlayers={players}
                                    canPromoteToCaptain={availableRoles.captain}
                                />
                                <CaptainSlotCard
                                    role="court_captain"
                                    player={courtCaptain}
                                    gradientFrom="#907575"
                                    gradientTo="#ffcec6"
                                    teamId={teamData.id}
                                    seasonId={teamData.season_id}
                                    onRoleChanged={handleRoleChanged}
                                    allPlayers={players}
                                    canPromoteToCaptain={availableRoles.captain}
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">Players</h3>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                                {regularPlayers.map((player) => (
                                    <PlayerCard
                                        key={player.id}
                                        player={player}
                                        teamId={teamData.id}
                                        seasonId={teamData.season_id}
                                        onRoleChanged={handleRoleChanged}
                                        onRemoved={handlePlayerRemoved}
                                        availableRoles={availableRoles}
                                    />
                                ))}

                                {players.length < maxPlayers && (
                                    <Card
                                        className="rounded-sm border-dashed border-2 h-[280px] hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer"
                                        onClick={handleOpenAddForm}
                                    >
                                        <CardContent className="p-4 h-full">
                                            <div className="flex flex-col items-center justify-center text-center h-full space-y-3">
                                                <div className="w-20 h-20 rounded-sm border-2 border-dashed border-muted-foreground/30 bg-muted/50 flex items-center justify-center">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="32"
                                                        height="32"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="text-muted-foreground"
                                                    >
                                                        <path d="M5 12h14" />
                                                        <path d="M12 5v14" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm">Add Player</h4>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Click to add a new player
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {nameHistory.length > 0 && (
                <div className="space-y-4">
                    <h2>Name History</h2>
                    <div className="panel rounded-md border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="text-left px-4 py-2 font-medium">Date</th>
                                    <th className="text-left px-4 py-2 font-medium">Old Name</th>
                                    <th className="text-left px-4 py-2 font-medium">New Name</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nameHistory.map(entry => (
                                    <tr key={entry.id} className="border-b last:border-0">
                                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                                            {new Date(entry.changedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-2 text-muted-foreground">{entry.oldName}</td>
                                        <td className="px-4 py-2 font-medium">{entry.newName}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}