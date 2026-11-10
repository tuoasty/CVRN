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
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
                {cards.map((card) => {
                    const player = players[card.playerId];
                    const name = player?.name ?? "Unknown";
                    const figure = (
                        <Image
                            src={card.imageUrl}
                            alt={`${name} player card, Season ${card.seasonNumber}, OVR ${card.ovr}`}
                            width={card.width}
                            height={card.height}
                            loading="lazy"
                            unoptimized
                            className="h-auto w-full"
                        />
                    );
                    const key = `${card.playerId}-${card.groupId}`;
                    return player?.href ? (
                        <Link
                            key={key}
                            href={player.href}
                            prefetch={false}
                            className="block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
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
