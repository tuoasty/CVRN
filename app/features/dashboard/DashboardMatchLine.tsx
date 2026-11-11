import Image from "next/image";
import type { DashboardMatch, DashboardTeam } from "@/server/domains/admin";
import { DefaultTeamLogo } from "@/app/components/ui/DefaultTeamLogo";
import { buildMatchMediaTitle } from "@/app/utils/matchLabel";
import MatchMediaSlotButton from "@/app/features/media/MatchMediaSlotButton";
import { useGroups } from "@/app/admin/AdminRoleProvider";
import { allowedMediaTypes } from "@/shared/auth/mediaAccess";

function TeamLogo({ team }: { team: DashboardTeam }) {
    return (
        <div className="relative h-6 w-6 shrink-0">
            {team.logoUrl ? (
                <Image src={team.logoUrl} alt={team.name} fill sizes="24px" className="object-contain" />
            ) : (
                <DefaultTeamLogo sizes="24px" alt={team.name} />
            )}
        </div>
    );
}

export default function DashboardMatchLine({ match, onChanged }: { match: DashboardMatch; onChanged: () => void }) {
    const mediaTypes = allowedMediaTypes(useGroups());
    const defaultTitle = buildMatchMediaTitle({
        homeTeamName: match.home.name,
        awayTeamName: match.away.name,
        matchType: match.matchType,
        week: match.week,
        matchCode: match.matchCode,
        playoffRound: match.playoffRound,
    });

    return (
        <div className="grid h-10 grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 last:border-b-0">
            <div className="flex items-center gap-1.5">
                <TeamLogo team={match.home} />
                <span className="text-xs text-muted-foreground">vs</span>
                <TeamLogo team={match.away} />
            </div>
            <p className="truncate text-sm" title={`${match.home.name} vs ${match.away.name}`}>
                {match.home.name}
                <span className="mx-1 text-muted-foreground">vs</span>
                {match.away.name}
            </p>
            <div className="flex items-center">
                {mediaTypes.includes("gfx") ? <MatchMediaSlotButton matchId={match.id} slot="gfx" current={match.gfx} defaultTitle={defaultTitle} onChanged={onChanged} /> : <div className="h-10 w-10 sm:h-8 sm:w-8" aria-hidden />}
                {mediaTypes.includes("video") ? <MatchMediaSlotButton matchId={match.id} slot="video" current={match.vod} defaultTitle={defaultTitle} onChanged={onChanged} /> : <div className="h-10 w-10 sm:h-8 sm:w-8" aria-hidden />}
            </div>
        </div>
    );
}
