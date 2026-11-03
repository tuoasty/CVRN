import {notFound} from "next/navigation";
import {getCachedPlayerCards, getCachedPlayerDetail, getCachedPlayerRecentMatches} from "@/server/cache/publicReads";
import {readOrEmpty} from "@/server/cache/readOrEmpty";
import PlayerDetailPage from "./PlayerDetailPage";

type Props = {
    params: Promise<{username: string}>;
};

export async function generateStaticParams() {
    return [];
}

export default async function PlayerPage({params}: Props) {
    const {username} = await params;

    const detail = await getCachedPlayerDetail(username);
    if (!detail) {
        notFound();
    }

    const [cards, matches] = await Promise.all([
        readOrEmpty(getCachedPlayerCards(detail.player.id), "player cards"),
        readOrEmpty(getCachedPlayerRecentMatches(detail.player.id), "recent matches"),
    ]);

    return <PlayerDetailPage detail={detail} cards={cards} matches={matches} />;
}
