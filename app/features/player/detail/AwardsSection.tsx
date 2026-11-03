import type {PlayerAwardListItem} from "@/app/utils/playerAwardList";
import {positionShortLabel} from "@/shared/volleyball/positions";
import {awardDetail, awardLabel, formatDate} from "./awardDisplay";
import {RuledSection, SectionLink} from "./RuledSection";
import {TeamLogoLink} from "./TeamLogoLink";

const AWARD_CAP = 5;

export function AwardTitle({item}: {item: PlayerAwardListItem}) {
    const detail = item.kind === "award"
        ? awardDetail(item.award)
        : item.spec.position ? positionShortLabel(item.spec.position) : null;
    return (
        <>
            <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{item.kind === "award" ? awardLabel(item.award) : item.spec.spec_name}</span>
                {item.kind === "spec" && (
                    <span className="shrink-0 font-mono text-xs tabular-nums text-secondary">{item.spec.stars}★</span>
                )}
                {item.kind === "spec" && item.spec.dropped && (
                    <span className="shrink-0 text-xs italic text-muted-foreground">dropped</span>
                )}
            </div>
            {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
        </>
    );
}

function AwardRow({item}: {item: PlayerAwardListItem}) {
    const source = item.kind === "award" ? item.award : item.spec;
    const season = `${source.region_code} · ${source.season_name}`;
    return (
        <li className="flex items-center gap-3 border-b border-border/60 py-2 text-sm last:border-b-0">
            <div className="min-w-0 flex-1">
                <AwardTitle item={item} />
                <p className="truncate text-xs text-muted-foreground [@container(min-width:30rem)]:hidden">{season}</p>
            </div>
            <span className="hidden w-32 shrink-0 truncate text-muted-foreground [@container(min-width:30rem)]:block">{season}</span>
            <span className="hidden shrink-0 font-mono text-xs tabular-nums text-muted-foreground [@container(min-width:30rem)]:block">{formatDate(source.awarded_at)}</span>
            <TeamLogoLink team={source} />
        </li>
    );
}

export function AwardsSection({items, careerHref}: {items: PlayerAwardListItem[]; careerHref: string | null}) {
    const action = careerHref && items.length > AWARD_CAP
        ? <SectionLink href={`${careerHref}#awards`}>View all {items.length}</SectionLink>
        : undefined;
    return (
        <RuledSection title="Awards" action={action}>
            <ul className="[container-type:inline-size]">
                {items.slice(0, AWARD_CAP).map(item => <AwardRow key={item.key} item={item} />)}
            </ul>
        </RuledSection>
    );
}
