import Link from "next/link";
import { Region } from "@/shared/types/db";
import { SeasonWithPlayoffConfig } from "@/server/domains/season";

interface Props {
    byRegion: Array<{ region: Region; seasons: SeasonWithPlayoffConfig[] }>;
    /** When set, season cards deep-link to this sub-page (e.g. "media") instead of home. */
    nextPage?: string;
}

export default function LeagueGrid({ byRegion, nextPage }: Props) {
    if (byRegion.length === 0) return null;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {byRegion.map(({ region, seasons }) => (
                <div key={region.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm">
                            {region.code}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{region.name}</span>
                    </div>
                    {seasons.map(s => {
                        const live = !s.end_date || new Date(s.end_date) > new Date();
                        return (
                            <Link
                                key={s.id}
                                href={`/${region.code.toLowerCase()}/${s.slug}${nextPage ? `/${nextPage}` : ""}`}
                                prefetch={false}
                                className="flex items-center justify-between gap-2 panel p-3 hover:border-primary/40 transition-colors group"
                            >
                                <span className="text-xs font-medium group-hover:text-primary transition-colors truncate">
                                    {s.name}
                                </span>
                                {live && (
                                    <span className="shrink-0 text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wide">
                                        Live
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
