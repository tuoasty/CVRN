import {notFound} from "next/navigation";
import {getPlayerDetailAction} from "@/app/actions/player.actions";
import PlayerDetailPage from "./PlayerDetailPage";

type Props = {
    params: Promise<{username: string}>;
};

export default async function PlayerPage({params}: Props) {
    const {username} = await params;
    const result = await getPlayerDetailAction(username);

    if (!result.ok || !result.value) {
        notFound();
    }

    return <PlayerDetailPage detail={result.value} />;
}
