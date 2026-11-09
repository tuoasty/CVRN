import Link from "next/link";
import {TeamMark} from "../sections/TeamMark";
import type {HeroItem} from "../model/types";

type ChampionItem = Extract<HeroItem, {kind: "champion"}>;

export function ChampionLockup({item, seasonLabel}: {item: ChampionItem; seasonLabel: string}) {
    return (
        <div className="flex h-full flex-col items-start gap-8 py-6 lg:flex-row lg:items-center lg:gap-10">
            <TeamMark team={item.champion} size={240} />
            <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{seasonLabel} · Champions</div>
                <div className="mt-3 text-5xl font-bold leading-none tracking-tight lg:text-6xl">{item.champion.name}</div>
                {item.final && (
                    <div className="mt-4 text-base text-muted-foreground">
                        Grand Final · <span className="font-mono text-foreground">{item.champion.name} {item.final.championSets}-{item.final.opponentSets} {item.final.opponent.name}</span>
                    </div>
                )}
                {item.podium.length > 0 && (
                    <div className="mt-6 space-y-2">
                        {item.podium.map(p => (
                            <div key={p.place} className="grid grid-cols-[40px_28px_1fr] items-center gap-2 text-base">
                                <span className="font-mono text-muted-foreground">{p.place === 2 ? "2nd" : "3rd"}</span>
                                <TeamMark team={p.team} size={24} />
                                <span>{p.team.name}</span>
                            </div>
                        ))}
                    </div>
                )}
                {item.href && (
                    <Link href={item.href} className="mt-6 inline-block text-sm font-semibold underline underline-offset-4 hover:decoration-2">
                        Season archive
                    </Link>
                )}
            </div>
        </div>
    );
}
