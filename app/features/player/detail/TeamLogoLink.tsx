import Image from "next/image";
import Link from "next/link";
import {DefaultTeamLogo} from "@/app/components/ui/DefaultTeamLogo";
import {getLogoClassName} from "@/app/lib/logoClass";
import {cn} from "@/lib/utils";
import {buildPublicTeamHref} from "@/app/utils/matchDetailHref";

export interface TeamLogoRef {
    team_disbanded: boolean;
    region_code: string;
    season_slug: string;
    team_slug: string | null;
    team_name: string | null;
    team_logo_url: string | null;
    team_logo_bg_removed: boolean;
}

export function TeamLogo({team, size = 28, className}: {team: Pick<TeamLogoRef, "team_name" | "team_logo_url" | "team_logo_bg_removed">; size?: number; className?: string}) {
    const sizes = `${size}px`;
    return (
        <span className={cn("relative block shrink-0", className)} style={className ? undefined : {width: size, height: size}}>
            {team.team_logo_url ? (
                <Image
                    src={team.team_logo_url}
                    alt={team.team_name ?? ""}
                    fill
                    sizes={sizes}
                    className={getLogoClassName(team.team_logo_bg_removed)}
                    unoptimized
                />
            ) : (
                <DefaultTeamLogo sizes={sizes} alt={team.team_name ?? ""} />
            )}
        </span>
    );
}

export function TeamLogoLink({team}: {team: TeamLogoRef}) {
    if (!team.team_name && !team.team_logo_url) return <span className="block size-7 shrink-0" />;
    const href = team.team_disbanded ? null : buildPublicTeamHref({
        regionCode: team.region_code,
        seasonSlug: team.season_slug,
        teamSlug: team.team_slug,
    });
    if (!href) return <TeamLogo team={team} />;
    return (
        <Link href={href} prefetch={false} aria-label={team.team_name ?? "Team"} className="block shrink-0 transition-opacity hover:opacity-70">
            <TeamLogo team={team} />
        </Link>
    );
}
