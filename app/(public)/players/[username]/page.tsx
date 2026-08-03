import {notFound} from "next/navigation";
import {getCachedPlayerDetail} from "@/server/cache/publicReads";
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

    return <PlayerDetailPage detail={detail} />;
}
