import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/app/(public)/home/sections/SectionHeading";
import type { TeamCard } from "@/server/domains/playerCard";
import type { LeaderPlayer } from "./LeadersSection";

type Props = {
    seasonNumber: number;
    cards: TeamCard[];
    players: Record<string, LeaderPlayer>;
};

export default function TeamCardsSection({ seasonNumber, cards, players }: Props) {
    return (
        <section aria-label={`Season ${seasonNumber} cards`} className="min-w-0">
            <SectionHeading title={`Season ${seasonNumber} cards`} />
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-x-4 gap-y-6">
                {cards.map((card) => {
                    const player = players[card.playerId];
                    const name = player?.name ?? "Unknown";
                    const figure = (
                        <figure className="min-w-0">
                            <Image
                                src={card.imageUrl}
                                alt={`${name} player card, Season ${card.seasonNumber}, OVR ${card.ovr}`}
                                width={card.width}
                                height={card.height}
                                loading="lazy"
                                unoptimized
                                className="h-auto w-full"
                            />
                            <figcaption className="mt-2 truncate text-xs font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                                {name}
                            </figcaption>
                        </figure>
                    );
                    const key = `${card.playerId}-${card.groupId}`;
                    return player?.href ? (
                        <Link
                            key={key}
                            href={player.href}
                            prefetch={false}
                            className="group block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                        >
                            {figure}
                        </Link>
                    ) : (
                        <div key={key} className="min-w-0">
                            {figure}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
