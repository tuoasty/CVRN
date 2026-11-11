"use client";

import ManageMatchDialog from "@/app/features/matches/ManageMatchDialog";
import CompleteMatchDialog from "@/app/features/matches/CompleteMatchDialog";
import UpdateMatchDialog from "@/app/features/matches/UpdateMatchDialog";
import DeleteMatchDialog from "@/app/features/matches/DeleteMatchDialog";
import MatchMediaSlotButton from "@/app/features/media/MatchMediaSlotButton";
import type { MatchWithDetails } from "@/server/domains/match";
import type { MediaPost } from "@/server/domains/media";
import type { ScheduleKind, ScheduleRow } from "./types";
import { useGroups } from "@/app/admin/AdminRoleProvider";
import { allowedMediaTypes } from "@/shared/auth/mediaAccess";

type Props = {
    row: ScheduleRow;
    details: MatchWithDetails;
    seasonId: string;
    regionCode: string;
    kind: ScheduleKind;
    media: { gfx: MediaPost | null; vod: MediaPost | null } | undefined;
    mediaTitle: string;
    onChanged: () => void;
};

function Gap() {
    return <div className="h-10 w-10 sm:h-8 sm:w-8" aria-hidden />;
}

export function AdminRowActions({ row, details, seasonId, regionCode, kind, media, mediaTitle, onChanged }: Props) {
    const { match, sets } = details;
    const isScheduled = match.status === "scheduled";
    const isCompleted = match.status === "completed";
    const groups = useGroups();
    const isAdmin = groups.includes("admin") || groups.includes("super_admin");
    const mediaTypes = allowedMediaTypes(groups);
    const canGfx = mediaTypes.includes("gfx");
    const canVideo = mediaTypes.includes("video");

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-end gap-0.5">
                {canGfx ? <MatchMediaSlotButton matchId={match.id} slot="gfx" current={media?.gfx ?? null} defaultTitle={mediaTitle} /> : <Gap />}
                {canVideo ? <MatchMediaSlotButton matchId={match.id} slot="video" current={media?.vod ?? null} defaultTitle={mediaTitle} /> : <Gap />}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-end gap-0.5">
            <ManageMatchDialog
                matchId={match.id}
                scheduledAt={match.scheduled_at}
                regionCode={regionCode}
                match={match}
                onSuccess={onChanged}
            />
            {isScheduled ? (
                <CompleteMatchDialog
                    matchId={match.id}
                    seasonId={seasonId}
                    homeTeamId={row.home.id}
                    awayTeamId={row.away.id}
                    homeTeamName={row.home.name}
                    awayTeamName={row.away.name}
                    bestOf={match.best_of}
                    onSuccess={onChanged}
                />
            ) : isCompleted ? (
                <UpdateMatchDialog
                    matchId={match.id}
                    seasonId={seasonId}
                    homeTeamId={row.home.id}
                    awayTeamId={row.away.id}
                    homeTeamName={row.home.name}
                    awayTeamName={row.away.name}
                    bestOf={match.best_of}
                    currentSets={sets}
                    currentMatchMvpId={match.match_mvp_player_id || ""}
                    currentLoserMvpId={match.loser_mvp_player_id || ""}
                    onSuccess={onChanged}
                    currentIsForfeit={match.is_forfeit ?? false}
                />
            ) : (
                <Gap />
            )}
            <MatchMediaSlotButton matchId={match.id} slot="gfx" current={media?.gfx ?? null} defaultTitle={mediaTitle} />
            <MatchMediaSlotButton matchId={match.id} slot="video" current={media?.vod ?? null} defaultTitle={mediaTitle} />
            {kind === "season" ? <DeleteMatchDialog matchId={match.id} onSuccess={onChanged} /> : <Gap />}
        </div>
    );
}
