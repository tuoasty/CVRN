"use client";

import {useMemo, useState, type ReactNode} from "react";
import {cn} from "@/lib/utils";
import type {PlayerDetail} from "@/server/domains/player";
import type {PlayerRecentMatch} from "@/server/domains/match";
import type {PublicPlayerCard} from "@/server/domains/playerCard";
import PlayerSeasonStatsTable from "@/app/features/player/PlayerSeasonStatsTable";
import BackButton from "@/app/components/public/BackButton";
import {buildPublicPlayerHref} from "@/app/utils/matchDetailHref";
import {buildPlayerAwardList} from "@/app/utils/playerAwardList";
import {AchievementsSection} from "@/app/features/player/detail/AchievementsSection";
import {AwardsSection} from "@/app/features/player/detail/AwardsSection";
import {HonoursSection} from "@/app/features/player/detail/HonoursSection";
import {PlayerBanner} from "@/app/features/player/detail/PlayerBanner";
import {AllPlayerCards, CARD_CAP, PlayerCardsSection} from "@/app/features/player/detail/PlayerCardsSection";
import {RecentMatchesSection} from "@/app/features/player/detail/RecentMatchesSection";
import {TeamHistorySection} from "@/app/features/player/detail/TeamHistorySection";
import {PODIUM_CATEGORIES} from "@/app/features/player/detail/awardDisplay";
import {planPlayerLayout, type SectionKey} from "@/app/features/player/detail/planPlayerLayout";
import {buildPlayerHonours} from "@/app/features/player/detail/playerHonours";
import {otherActiveTeams} from "@/app/features/player/detail/teamHistoryPreview";

const TWO_COLUMNS = "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]";

function Columns({columns, render}: {columns: SectionKey[][]; render: (key: SectionKey) => ReactNode}) {
    if (columns.length === 0) return null;
    return (
        <div className={cn("grid min-w-0 flex-1 gap-x-12 gap-y-11", columns.length === 2 && TWO_COLUMNS)}>
            {columns.map(column => (
                <div key={column.join("-")} className="min-w-0 space-y-11">
                    {column.map(key => <div key={key}>{render(key)}</div>)}
                </div>
            ))}
        </div>
    );
}

type Props = {
    detail: PlayerDetail;
    cards: PublicPlayerCard[];
    matches: PlayerRecentMatch[];
};

export default function PlayerDetailPage({detail, cards, matches}: Props) {
    const {player, seasonStats, awards, specs, activeSpec, teamHistory} = detail;
    const [failedCards, setFailedCards] = useState<ReadonlySet<string>>(new Set());
    const [showAllCards, setShowAllCards] = useState(false);

    const visibleCards = useMemo(() => cards.filter(card => !failedCards.has(card.imageUrl)), [cards, failedCards]);
    const onCardFailed = (imageUrl: string) => setFailedCards(prev => new Set(prev).add(imageUrl));

    const achievements = awards.filter(a => PODIUM_CATEGORIES.has(a.category));
    const awardList = buildPlayerAwardList(
        awards.filter(a => !PODIUM_CATEGORIES.has(a.category) && a.category !== "staff_team"),
        specs,
    );
    const honours = buildPlayerHonours(awards, specs);
    const otherTeams = otherActiveTeams(teamHistory, player.current_team);
    const playerName = player.display_name || player.username || "Player";
    const careerHref = buildPublicPlayerHref(player.username);
    const careerBase = careerHref ? `${careerHref}/career` : null;

    const teamLogoBySeasonId = new Map<string, {logo_url: string | null; logo_bg_removed: boolean}>();
    const lockedActiveSeasons = new Set<string>();
    for (const e of teamHistory) {
        if (lockedActiveSeasons.has(e.season_id)) continue;
        const isActive = e.left_at == null;
        if (isActive || !teamLogoBySeasonId.has(e.season_id)) {
            teamLogoBySeasonId.set(e.season_id, {logo_url: e.team_logo_url, logo_bg_removed: e.team_logo_bg_removed});
            if (isActive) lockedActiveSeasons.add(e.season_id);
        }
    }

    const layout = planPlayerLayout({
        cards: visibleCards.length,
        achievements: achievements.length > 0,
        awards: awardList.length > 0,
        matches: matches.length > 0,
        teams: teamHistory.length > 0,
    });

    const renderSection = (key: SectionKey): ReactNode => {
        switch (key) {
            case "honours":
                return <HonoursSection honours={honours} careerHref={careerBase} />;
            case "achievements":
                return <AchievementsSection achievements={achievements} careerHref={careerBase} />;
            case "awards":
                return <AwardsSection items={awardList} careerHref={careerBase} />;
            case "teams":
                return <TeamHistorySection history={teamHistory} careerHref={careerBase} />;
            case "matches":
                return <RecentMatchesSection matches={matches} />;
        }
    };

    const hasCards = visibleCards.length > 0;
    const hasRecord = hasCards || layout.beside.length > 0 || layout.below.length > 0 || seasonStats.length > 0;
    const stackUntilXl = Math.min(visibleCards.length, CARD_CAP) >= CARD_CAP;

    return (
        <div className="max-w-[1440px] mx-auto px-4 py-6 space-y-11">
            <BackButton />

            <PlayerBanner player={player} activeSpec={activeSpec} otherTeams={otherTeams} />

            {seasonStats.length > 0 && (
                <PlayerSeasonStatsTable rows={seasonStats} teamLogoBySeasonId={teamLogoBySeasonId} />
            )}

            {(hasCards || layout.beside.length > 0) && (
                <div className={cn(
                    "flex flex-col gap-11",
                    stackUntilXl ? "xl:flex-row xl:items-start xl:gap-12" : "lg:flex-row lg:items-start lg:gap-12",
                )}>
                    {hasCards && (
                        <div className="min-w-0 shrink-0">
                            <PlayerCardsSection
                                cards={visibleCards}
                                playerName={playerName}
                                showAll={showAllCards}
                                onToggleAll={() => setShowAllCards(open => !open)}
                                onFailed={onCardFailed}
                            />
                        </div>
                    )}
                    <Columns columns={layout.beside} render={renderSection} />
                </div>
            )}

            <Columns columns={layout.below} render={renderSection} />

            {showAllCards && visibleCards.length > CARD_CAP && (
                <AllPlayerCards cards={visibleCards} playerName={playerName} onFailed={onCardFailed} />
            )}

            {!hasRecord && <p className="text-sm text-muted-foreground">No league record yet.</p>}
        </div>
    );
}
