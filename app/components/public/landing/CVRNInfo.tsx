import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Region } from "@/shared/types/db";
import { SeasonWithPlayoffConfig } from "@/server/domains/season";

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
                <div id="view-league" className="w-full max-w-4xl mt-14 space-y-5">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold text-center">
                        View League
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {byRegion.map(({ region, seasons }) => (
                            <div key={region.id} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm">
                                        {region.code}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">{region.name}</span>
                                </div>
                                {seasons.map(s => (
                                    <Link
                                        key={s.id}
                                        href={`/${region.code.toLowerCase()}/${s.slug}/home`}
                                        className="flex items-center justify-between gap-2 panel p-3 hover:border-primary/40 transition-colors group"
                                    >
                                        <span className="text-xs font-medium group-hover:text-primary transition-colors truncate">
                                            {s.name}
                                        </span>
                                        {s.is_active && (
                                            <span className="shrink-0 text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wide">
                                                Live
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
