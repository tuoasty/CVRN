"use client";

import React, {useState} from "react";
import Link from "next/link";
import {CalendarDays, Plus} from "lucide-react";
import { AdminPageHeader } from "@/app/components/admin/AdminPageHeader";
import { Skeleton } from "@/app/components/ui/skeleton";
import {Button} from "@/app/components/ui/button";
import {Badge} from "@/app/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import SeasonFormDialog from "@/app/features/seasons/SeasonFormDialog";
import {useSeasons, mutateAllSeasons} from "@/app/hooks/useSeasons";
import {useRegions} from "@/app/hooks/useRegions";
import {SeasonWithPlayoffConfig} from "@/server/domains/season";
import {deleteSeasonAction} from "@/app/actions/season.actions";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";
import { getSeasonStatus, SeasonStatus } from "@/server/domains/season/helpers/getSeasonStatus";
import { REGION_ORDER } from "@/app/features/leaderboard/useLeaderboardFilters";
import { useIsSuperAdmin } from "@/app/admin/AdminRoleProvider";

const STATUS_BADGE: Record<SeasonStatus, {label: string; variant: "default" | "secondary" | "outline"}> = {
    upcoming: {label: "Upcoming", variant: "outline"},
    active: {label: "Active", variant: "default"},
    ended: {label: "Ended", variant: "secondary"},
};

export default function AdminSeasonsPage() {
    const {seasons, isLoading, error} = useSeasons();
    const {regions} = useRegions();
    const isSuperAdmin = useIsSuperAdmin();

    const [formOpen, setFormOpen] = useState(false);
    const [editSeason, setEditSeason] = useState<SeasonWithPlayoffConfig | undefined>(undefined);
    const [deleteTarget, setDeleteTarget] = useState<SeasonWithPlayoffConfig | null>(null);
    const [deleting, setDeleting] = useState(false);
    const regionName = (regionId: string) => {
        const r = regions.find((reg) => reg.id === regionId);
        return r ? `${r.code.toUpperCase()} — ${r.name}` : regionId;
    };

    const regionRank = (regionId: string) => {
        const code = regions.find((reg) => reg.id === regionId)?.code.toUpperCase() ?? "";
        const i = (REGION_ORDER as readonly string[]).indexOf(code);
        return i === -1 ? REGION_ORDER.length : i;
    };

    const seasonGroups = Array.from(
        seasons.reduce((acc, season) => {
            const list = acc.get(season.season_number) ?? [];
            list.push(season);
            acc.set(season.season_number, list);
            return acc;
        }, new Map<number, SeasonWithPlayoffConfig[]>())
    )
        .sort(([a], [b]) => b - a)
        .map(([seasonNumber, list]) => ({
            seasonNumber,
            seasons: [...list].sort((a, b) =>
                regionRank(a.region_id) - regionRank(b.region_id)
                || Number(a.league_type !== "main") - Number(b.league_type !== "main")
            ),
        }));

    const formatDate = (d: string | null) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-US", {year: "numeric", month: "short", day: "numeric"});
    };

    const handleCreate = () => {
        setEditSeason(undefined);
        setFormOpen(true);
    };

    const handleEdit = (season: SeasonWithPlayoffConfig) => {
        setEditSeason(season);
        setFormOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const result = await deleteSeasonAction({seasonId: deleteTarget.id});
            if (!result.ok) {
                clientLogger.error("AdminSeasonsPage", "Failed to delete season", {error: result.error});
                toast.error("Failed to delete season", result.error.message);
                return;
            }
            await mutateAllSeasons();
            toast.success("Season deleted");
            setDeleteTarget(null);
        } catch (err) {
            clientLogger.error("AdminSeasonsPage", "Exception deleting season", {err});
            toast.error("Something went wrong");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-section">
                <AdminPageHeader
                    icon={CalendarDays}
                    title="Season Management"
                    description="Create and manage league seasons by region"
                    actions={
                        <Button onClick={handleCreate} className="rounded-sm gap-2">
                            <Plus className="h-4 w-4" />
                            New Season
                        </Button>
                    }
                />

                {isLoading && <Skeleton className="h-64 w-full rounded-sm" />}

                {error && (
                    <div className="panel p-6">
                        <p className="text-destructive">{error}</p>
                    </div>
                )}

                {!isLoading && !error && seasons.length === 0 && (
                    <div className="panel p-6 text-center">
                        <p className="text-muted-foreground">No seasons found. Create one to get started.</p>
                    </div>
                )}

                {!isLoading && !error && seasons.length > 0 && (
                    <div className="mt-6 space-y-8">
                        {seasonGroups.map(group => (
                            <section key={group.seasonNumber}>
                                <h2 className="text-sm font-semibold pb-2 border-b border-border">
                                    Season <span className="font-mono tabular-nums">{group.seasonNumber}</span>
                                </h2>
                                <div className="panel overflow-x-auto mt-2">
                                    <table className="table-dense">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Region</th>
                                                <th>Start</th>
                                                <th>End</th>
                                                <th>Status</th>
                                                <th className="w-32">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.seasons.map((season) => {
                                                const status = STATUS_BADGE[getSeasonStatus(season)];
                                                return (
                                                    <tr key={season.id}>
                                                        <td>
                                                            <div className="font-medium">{season.name}</div>
                                                            <div className="text-xs text-muted-foreground font-mono">{season.slug}</div>
                                                        </td>
                                                        <td className="text-sm">
                                                            {regionName(season.region_id)}
                                                            {season.league_type === "side" && (
                                                                <span className="ml-2 text-xs text-muted-foreground">Side</span>
                                                            )}
                                                        </td>
                                                        <td className="text-sm">{formatDate(season.start_date)}</td>
                                                        <td className="text-sm">{formatDate(season.end_date)}</td>
                                                        <td>
                                                            <Badge variant={status.variant} className="rounded-sm text-xs">{status.label}</Badge>
                                                        </td>
                                                        <td>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="rounded-sm"
                                                                    onClick={() => handleEdit(season)}
                                                                >
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="rounded-sm"
                                                                    asChild
                                                                >
                                                                    <Link href={`/admin/seasons/${season.id}/results`}>Results</Link>
                                                                </Button>
                                                                {isSuperAdmin && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        onClick={() => setDeleteTarget(season)}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            <SeasonFormDialog
                season={editSeason}
                open={formOpen}
                onOpenChange={setFormOpen}
            />

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent className="rounded-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Season</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone. Teams and matches in this season may be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm" disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
