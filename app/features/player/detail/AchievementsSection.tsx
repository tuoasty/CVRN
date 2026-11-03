import type {PlayerAward} from "@/server/domains/player";
import {cn} from "@/lib/utils";
import {formatDate, placeLabel} from "./awardDisplay";
import {RuledSection, CareerLink} from "./RuledSection";
import {TeamLogoLink} from "./TeamLogoLink";

const ACHIEVEMENT_CAP = 3;

export function AchievementsSection({achievements, careerHref}: {achievements: PlayerAward[]; careerHref: string | null}) {
    const action = careerHref && achievements.length > ACHIEVEMENT_CAP
        ? <CareerLink href={`${careerHref}#achievements`}>View all {achievements.length}</CareerLink>
        : undefined;
    return (
        <RuledSection title="Achievements" action={action}>
            <ul>
                {achievements.slice(0, ACHIEVEMENT_CAP).map(award => {
                    const place = placeLabel(award);
                    return (
                        <li key={award.id} className="flex items-center gap-3 border-b border-border/60 py-2 text-sm last:border-b-0">
                            <span className={cn("w-16 shrink-0 font-mono tabular-nums", place.className)}>{place.text}</span>
                            <span className="min-w-0 flex-1 truncate text-muted-foreground">{award.region_code} · {award.season_name}</span>
                            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{formatDate(award.awarded_at)}</span>
                            <TeamLogoLink team={award} />
                        </li>
                    );
                })}
            </ul>
        </RuledSection>
    );
}
