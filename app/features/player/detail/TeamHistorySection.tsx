import Link from "next/link";
import type {PlayerTeamHistoryEntry} from "@/server/domains/player";
import {buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import {positionLabel} from "@/shared/volleyball/positions";
import {ROLE_LABELS} from "./awardDisplay";
import {RuledSection, CareerLink} from "./RuledSection";
import {TeamLogo} from "./TeamLogoLink";
import {isSeasonEnded, selectTeamHistoryPreview} from "./teamHistoryPreview";

function TeamRow({entry}: {entry: PlayerTeamHistoryEntry}) {
    const role = entry.role !== "player" ? ROLE_LABELS[entry.role] : null;
    const active = entry.left_at === null && !isSeasonEnded(entry);
    const href = entry.team_disbanded ? null : buildPublicTeamHref({
        regionCode: entry.region_code,
        seasonSlug: entry.season_slug,
        teamSlug: entry.team_slug,
    });
    const body = (
        <div className="flex items-center gap-3 py-2">
            <TeamLogo team={entry} />
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline gap-2 text-sm">
                    <span className="truncate font-semibold">{entry.team_name}</span>
                    {entry.position && (
                        <span title={positionLabel(entry.position)} className="shrink-0 font-mono text-xs text-muted-foreground">{entry.position}</span>
                    )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                    {entry.region_code} · {entry.season_name}
                    {entry.league_type === "side" && " · Side League"}
                </p>
            </div>
            {(role || active) && (
                <div className="shrink-0 text-right text-xs">
                    {role && <p className="text-muted-foreground">{role}</p>}
                    {active && <p className="font-semibold">Active</p>}
                </div>
            )}
        </div>
    );
    return (
        <li className="border-b border-border/60 last:border-b-0">
            {href ? <Link href={href} prefetch={false} className="block transition-colors hover:bg-muted/30">{body}</Link> : body}
        </li>
    );
}

export function TeamHistorySection({history, careerHref}: {history: PlayerTeamHistoryEntry[]; careerHref: string | null}) {
    const {visible, hiddenCount} = selectTeamHistoryPreview(history);
    const action = careerHref && hiddenCount > 0
        ? <CareerLink href={`${careerHref}#team-history`}>View all {history.length}</CareerLink>
        : undefined;
    return (
        <RuledSection title="Team History" action={action}>
            <ul className="grid gap-x-12 [grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr))]">
                {visible.map(entry => <TeamRow key={`${entry.team_id}-${entry.season_id}`} entry={entry} />)}
            </ul>
        </RuledSection>
    );
}
