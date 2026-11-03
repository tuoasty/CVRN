import Image from "next/image";
import type {PublicPlayerCard} from "@/server/domains/playerCard";
import {cn} from "@/lib/utils";
import {RuledSection} from "./RuledSection";

export const CARD_CAP = 3;

export function PlayerCardFigure({card, playerName, onFailed}: {card: PublicPlayerCard; playerName: string; onFailed: (imageUrl: string) => void}) {
    return (
        <figure className="min-w-0">
            <Image
                src={card.imageUrl}
                alt={`${playerName} player card, Season ${card.seasonNumber}, OVR ${card.ovr}`}
                width={card.width}
                height={card.height}
                loading="lazy"
                unoptimized
                className="h-auto w-full"
                onError={() => onFailed(card.imageUrl)}
            />
            <figcaption className="mt-2 text-xs">
                <p className="font-semibold">Season {card.seasonNumber} · {card.groupName}</p>
                {card.teamName && <p className="truncate text-muted-foreground">{card.teamName}</p>}
            </figcaption>
        </figure>
    );
}

export function PlayerCardsSection({cards, playerName, showAll, onToggleAll, onFailed}: {
    cards: PublicPlayerCard[];
    playerName: string;
    showAll: boolean;
    onToggleAll: () => void;
    onFailed: (imageUrl: string) => void;
}) {
    const shown = cards.slice(0, CARD_CAP);
    const single = shown.length === 1;
    const action = cards.length > CARD_CAP ? (
        <button type="button" onClick={onToggleAll} className="shrink-0 text-xs font-medium text-primary hover:underline">
            {showAll ? "Show fewer" : `View all ${cards.length}`}
        </button>
    ) : undefined;
    return (
        <RuledSection title={single ? "Player Card" : "Player Cards"} action={action}>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:flex-wrap lg:flex-nowrap">
                {shown.map(card => (
                    <div key={card.imageUrl} className={cn("w-full shrink-0", single ? "sm:w-[300px]" : "sm:w-[240px]")}>
                        <PlayerCardFigure card={card} playerName={playerName} onFailed={onFailed} />
                    </div>
                ))}
            </div>
        </RuledSection>
    );
}

export function AllPlayerCards({cards, playerName, onFailed}: {
    cards: PublicPlayerCard[];
    playerName: string;
    onFailed: (imageUrl: string) => void;
}) {
    return (
        <RuledSection title="All Player Cards">
            <div className="mt-3 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
                {cards.map(card => (
                    <PlayerCardFigure key={card.imageUrl} card={card} playerName={playerName} onFailed={onFailed} />
                ))}
            </div>
        </RuledSection>
    );
}
