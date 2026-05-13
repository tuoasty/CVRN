"use client";

import React, {useState} from "react";
import Link from "next/link";
import {CalendarDays, Plus} from "lucide-react";
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

export default function AdminSeasonsPage() {
    const {seasons, isLoading, error} = useSeasons();
    const {regions} = useRegions();

    const [formOpen, setFormOpen] = useState(false);
    const [editSeason, setEditSeason] = useState<SeasonWithPlayoffConfig | undefined>(undefined);
    const [deleteTarget, setDeleteTarget] = useState<SeasonWithPlayoffConfig | null>(null);
    const [deleting, setDeleting] = useState(false);
    const regionName = (regionId: string) => {
        const r = regions.find((reg) => reg.id === regionId);
        return r ? `${r.code.toUpperCase()} — ${r.name}` : regionId;
    };

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
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <CalendarDays className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Season Management
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Create and manage league seasons by region
                        </p>
                    </div>
                    <Button onClick={handleCreate} className="rounded-sm gap-2">
                        <Plus className="h-4 w-4" />
                        New Season
                    </Button>
                </div>

                {isLoading && (
                    <div className="panel p-6">
                        <p className="text-muted-foreground">Loading seasons...</p>
                    </div>
                )}

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
                    <div className="panel overflow-x-auto mt-6">
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
                                {seasons.map((season) => (
                                    <tr key={season.id}>
                                        <td>
                                            <div className="font-medium">{season.name}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{season.slug}</div>
                                        </td>
                                        <td className="text-sm">{regionName(season.region_id)}</td>
                                        <td className="text-sm">{formatDate(season.start_date)}</td>
                                        <td className="text-sm">{formatDate(season.end_date)}</td>
                                        <td>
                                            {season.end_date ? (
                                                <Badge variant="secondary" className="rounded-sm text-xs">Completed</Badge>
                                            ) : season.is_active ? (
                                                <Badge variant="default" className="rounded-sm text-xs">Active</Badge>
                                            ) : (
                                                <Badge variant="outline" className="rounded-sm text-xs">Inactive</Badge>
                                            )}
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setDeleteTarget(season)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
