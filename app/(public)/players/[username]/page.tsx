import {notFound} from "next/navigation";
import {getCachedPlayerCards, getCachedPlayerDetail} from "@/server/cache/publicReads";
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

    const cards = await getCachedPlayerCards(detail.player.id);

    return <PlayerDetailPage detail={detail} cards={cards} />;
}
