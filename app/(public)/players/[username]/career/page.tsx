import {notFound} from "next/navigation";
import {getCachedPlayerDetail} from "@/server/cache/publicReads";
import CareerPage from "./CareerPage";

type Props = {
    params: Promise<{username: string}>;
};

export async function generateStaticParams() {
    return [];
}

export default async function PlayerCareerPage({params}: Props) {
    const {username} = await params;

    const detail = await getCachedPlayerDetail(username);
    if (!detail) {
        notFound();
    }

    return <CareerPage detail={detail} />;
}
