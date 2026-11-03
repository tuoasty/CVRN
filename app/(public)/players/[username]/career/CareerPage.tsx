import type {ReactNode} from "react";
import type {PlayerDetail} from "@/server/domains/player";
import {cn} from "@/lib/utils";
import {buildPublicPlayerHref} from "@/app/utils/matchDetailHref";
import {positionLabel} from "@/shared/volleyball/positions";
import {AwardTitle} from "@/app/features/player/detail/AwardsSection";
import {RuledSection} from "@/app/features/player/detail/RuledSection";
import {TeamLogoLink, type TeamLogoRef} from "@/app/features/player/detail/TeamLogoLink";
import {formatDate, placeLabel, ROLE_LABELS, selectPlayerRecord} from "@/app/features/player/detail/awardDisplay";
import {careerStatus, teamRowKey} from "@/app/features/player/detail/teamHistoryPreview";
import {CareerHeader} from "./CareerHeader";

const CELL = "py-2 pr-4 align-middle last:pr-0";
const ROW = "border-b border-border/60 last:border-b-0";
const DATE_CELL = cn(CELL, "whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground");
const MUTED_CELL = cn(CELL, "whitespace-nowrap text-muted-foreground");

function CareerTable({headers, children}: {headers: string[]; children: ReactNode}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                    <tr className="border-b border-border">
                        {headers.map(header => (
                            <th key={header} scope="col" className="py-2 pr-4 text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground last:pr-0">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}

function TeamCell({team, tag}: {team: TeamLogoRef; tag?: string}) {
    return (
        <td className={CELL}>
            <div className="flex min-w-0 items-center gap-2">
                <TeamLogoLink team={team} />
                <span className="truncate">{team.team_name}</span>
                {tag && <span className="shrink-0 text-xs text-muted-foreground">{tag}</span>}
            </div>
        </td>
    );
}

export default function CareerPage({detail}: {detail: PlayerDetail}) {
    const {player, awards, specs, teamHistory} = detail;
    const {achievements, awardList} = selectPlayerRecord(awards, specs);
    const name = player.display_name || player.username || "Player";
    const playerHref = buildPublicPlayerHref(player.username);

    const sections = [
        {id: "achievements", label: "Achievements", present: achievements.length > 0},
        {id: "awards", label: "Awards", present: awardList.length > 0},
        {id: "team-history", label: "Team History", present: teamHistory.length > 0},
    ].filter(section => section.present);

    return (
        <div className="max-w-[1440px] mx-auto px-4 pb-6 space-y-11 [&_section]:scroll-mt-40">
            <CareerHeader
                name={name}
                username={player.username}
                avatarUrl={player.avatar_url}
                playerHref={playerHref}
                sections={sections}
            />

            {achievements.length > 0 && (
                <RuledSection id="achievements" title="Achievements">
                    <CareerTable headers={["Place", "Season", "Date", "Team"]}>
                        {achievements.map(award => {
                            const place = placeLabel(award);
                            return (
                                <tr key={award.id} className={ROW}>
                                    <td className={cn(CELL, "whitespace-nowrap font-mono tabular-nums", place.className)}>{place.text}</td>
                                    <td className={MUTED_CELL}>{award.region_code} · {award.season_name}</td>
                                    <td className={DATE_CELL}>{formatDate(award.awarded_at, award.region_code)}</td>
                                    <TeamCell team={award} />
                                </tr>
                            );
                        })}
                    </CareerTable>
                </RuledSection>
            )}

            {awardList.length > 0 && (
                <RuledSection id="awards" title="Awards">
                    <CareerTable headers={["Award", "Season", "Date", "Team"]}>
                        {awardList.map(item => {
                            const source = item.kind === "award" ? item.award : item.spec;
                            return (
                                <tr key={item.key} className={ROW}>
                                    <td className={CELL}><AwardTitle item={item} /></td>
                                    <td className={MUTED_CELL}>{source.region_code} · {source.season_name}</td>
                                    <td className={DATE_CELL}>{formatDate(source.awarded_at, source.region_code)}</td>
                                    <TeamCell team={source} />
                                </tr>
                            );
                        })}
                    </CareerTable>
                </RuledSection>
            )}

            {teamHistory.length > 0 && (
                <RuledSection id="team-history" title="Team History">
                    <CareerTable headers={["Team", "Position", "Role", "Season", "Status"]}>
                        {teamHistory.map((entry, index) => {
                            const status = careerStatus(entry);
                            return (
                                <tr key={teamRowKey(entry, index)} className={ROW}>
                                    <TeamCell team={entry} tag={entry.league_type === "side" ? "Side League" : undefined} />
                                    <td className={cn(CELL, "font-mono text-xs text-muted-foreground")}>
                                        {entry.position && <span title={positionLabel(entry.position)}>{entry.position}</span>}
                                    </td>
                                    <td className={MUTED_CELL}>{entry.role !== "player" ? ROLE_LABELS[entry.role] : null}</td>
                                    <td className={MUTED_CELL}>{entry.region_code} · {entry.season_name}</td>
                                    <td className={cn(CELL, "whitespace-nowrap", status === "Active" ? "font-semibold" : "text-muted-foreground")}>{status}</td>
                                </tr>
                            );
                        })}
                    </CareerTable>
                </RuledSection>
            )}

            {sections.length === 0 && <p className="text-sm text-muted-foreground">No league record yet.</p>}
        </div>
    );
}
