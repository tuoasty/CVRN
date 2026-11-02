"use client";

import { useEffect, useMemo } from "react";
import { useAdminDashboard } from "@/app/hooks/useAdminDashboard";
import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { pickDashboardSeasons } from "@/server/domains/admin/helpers/pickDashboardSeasons";
import { toast } from "@/app/utils/toast";
import { cn } from "@/lib/utils";
import AdminDashboardSkeleton from "@/app/features/dashboard/AdminDashboardSkeleton";
import DashboardColumnView from "@/app/features/dashboard/DashboardColumnView";

const GRID_TRACKS: Record<number, string> = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
};

export default function AdminDashboardPage() {
    const { columns, isLoading, failed, refresh } = useAdminDashboard();
    const { regions } = useRegions();
    const { seasons } = useSeasons();

    useEffect(() => {
        if (failed) toast.error("Failed to load the dashboard");
    }, [failed]);

    const shells = useMemo(
        () => (failed ? pickDashboardSeasons(regions, seasons) : []),
        [failed, regions, seasons]
    );

    if (isLoading && !failed) return <AdminDashboardSkeleton />;

    const trackCount = failed ? shells.length : columns.length;

    return (
        <div className="page-wide pb-24 pt-6">
            <h1 className="mb-5 text-2xl font-semibold tracking-tight">Dashboard</h1>

            {trackCount === 0 && !failed ? (
                <div className="flex min-h-60 items-center justify-center text-center text-muted-foreground">
                    No active seasons.
                </div>
            ) : (
                <div className={cn("grid grid-cols-1 gap-10", GRID_TRACKS[trackCount] ?? "lg:grid-cols-4")}>
                    {failed
                        ? shells.map(({ region, season }) => (
                            <DashboardColumnView
                                key={season.id}
                                regionCode={region.code.toUpperCase()}
                                seasonId={season.id}
                                seasonName={season.name}
                                teamCount={null}
                                rounds={[]}
                                failed
                                onChanged={refresh}
                            />
                        ))
                        : columns.map(column => (
                            <DashboardColumnView
                                key={column.seasonId}
                                regionCode={column.regionCode}
                                seasonId={column.seasonId}
                                seasonName={column.seasonName}
                                teamCount={column.teamCount}
                                rounds={column.rounds}
                                onChanged={refresh}
                            />
                        ))}
                </div>
            )}
        </div>
    );
}
