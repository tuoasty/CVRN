import {HeroSection} from "./hero/HeroSection";
import {ResultsSection} from "./sections/ResultsSection";
import {UpcomingSection} from "./sections/UpcomingSection";
import {AwardsSection} from "./sections/AwardsSection";
import {WatchSection} from "./sections/WatchSection";
import {StandingsSection} from "./sections/StandingsSection";
import {LeadersSection} from "./sections/LeadersSection";
import {MediaSection} from "./sections/MediaSection";
import {NewsSection} from "./sections/NewsSection";
import type {HomeView} from "./model/types";

const TWO_COL = "page-wide mt-14 grid gap-12 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]";

export default function HomePage({view, seasonLabel}: {view: HomeView; seasonLabel: string}) {
    const completed = view.phase === "completed";
    const hasStandings = view.standings.rows.length > 0;
    return (
        <div className="pb-20">
            <HeroSection items={view.hero} seasonLabel={seasonLabel} />
            <div className={TWO_COL}>
                <ResultsSection {...view.results} />
                {completed ? (
                    <div className={view.results.days.length > 0 ? "lg:relative" : undefined}>
                        <div className={view.results.days.length > 0 ? "lg:absolute lg:inset-0" : undefined}>
                            <AwardsSection rows={view.awards} href={`${view.basePath}/archive`} />
                        </div>
                    </div>
                ) : (
                    <UpcomingSection days={view.upcoming} />
                )}
            </div>
            {(view.vod || hasStandings) && (
                <div className={TWO_COL}>
                    {view.vod && <WatchSection vod={view.vod} />}
                    <StandingsSection {...view.standings} />
                </div>
            )}
            {view.leaders.length > 0 && (
                <div className="page-wide mt-14">
                    <LeadersSection columns={view.leaders} href={`${view.basePath}/leaderboard`} />
                </div>
            )}
            {view.media.tiles.length > 0 && (
                <div className="page-wide mt-14">
                    <MediaSection {...view.media} />
                </div>
            )}
            {view.news.length > 0 && (
                <div className="page-wide mt-14">
                    <NewsSection rows={view.news} />
                </div>
            )}
        </div>
    );
}
