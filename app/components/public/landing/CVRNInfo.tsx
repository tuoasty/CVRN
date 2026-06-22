import { ExternalLink } from "lucide-react";
import { Region } from "@/shared/types/db";
import { SeasonWithPlayoffConfig } from "@/server/domains/season";
import LeagueGrid from "@/app/components/public/landing/LeagueGrid";

interface Props {
    byRegion: Array<{ region: Region; seasons: SeasonWithPlayoffConfig[] }>;
}

export default function CVRNInfo({ byRegion }: Props) {
    return (
        <section className="bg-background border-t border-border flex flex-col items-center justify-center px-6 py-12 sm:py-16 md:py-24">
            <div className="max-w-2xl w-full text-center space-y-8">

                <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
                        Confederate Volleyball Roblox
                    </p>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
                        CVRN
                    </h1>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                    The official CVR Network
                </p>

                <a
                    href="https://www.roblox.com/games/79010415692181/CVR-Retro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-9 px-5 rounded-sm border border-border text-xs font-semibold uppercase tracking-wider hover:bg-muted/50 transition-colors"
                >
                    <ExternalLink className="h-3 w-3" />
                    Play CVR
                </a>

            </div>

            {byRegion.length > 0 && (
                <div className="w-full max-w-4xl mt-14 space-y-5">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold text-center">
                        View League
                    </p>
                    <LeagueGrid byRegion={byRegion} />
                </div>
            )}
        </section>
    );
}
