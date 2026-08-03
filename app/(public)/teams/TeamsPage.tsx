import PublicTeamCard from "@/app/(public)/teams/PublicTeamCard";
import { Users } from "lucide-react";
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader";
import type { TeamWithRegion } from "@/server/domains/team";
import type { Region } from "@/shared/types/db";
import type { SeasonWithPlayoffConfig } from "@/server/domains/season";

type Props = {
    season: SeasonWithPlayoffConfig;
    region: Region;
    teams: TeamWithRegion[];
};

export default function TeamsPage({ season, region, teams }: Props) {
    const subtitle = `${season.name} · ${region.name}${teams.length > 0 ? ` · ${teams.length} teams` : ""}`;

    return (
        <>
            <div className="page-wide space-y-6 py-6">
                <PublicPageHeader icon={Users} title="Teams" subtitle={subtitle} />

                {teams.length === 0 ? (
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                No teams found for this season
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {teams.map((team, index) => (
                            <PublicTeamCard key={team.id} team={team} isPriority={index < 3} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}