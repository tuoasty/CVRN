import {HeroSection} from "./hero/HeroSection";
import {ResultsSection} from "./sections/ResultsSection";
import {UpcomingSection} from "./sections/UpcomingSection";
import type {HomeView} from "./model/types";

export default function HomePage({view, seasonLabel}: {view: HomeView; seasonLabel: string}) {
    const showUpcoming = view.phase !== "completed";
    return (
        <div className="pb-20">
            <HeroSection items={view.hero} seasonLabel={seasonLabel} />
            <div className="page-wide mt-14 grid gap-12 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
                <ResultsSection {...view.results} />
                {showUpcoming && <UpcomingSection days={view.upcoming} />}
            </div>
        </div>
    );
}
