import {HeroSection} from "./hero/HeroSection";
import type {HomeView} from "./model/types";

export default function HomePage({view, seasonLabel}: {view: HomeView; seasonLabel: string}) {
    return (
        <div className="pb-20">
            <HeroSection items={view.hero} seasonLabel={seasonLabel} />
        </div>
    );
}
