import {notFound} from "next/navigation";
import {getCachedPlayerDetail} from "@/server/cache/publicReads";
import PlayerDetailPage from "./PlayerDetailPage";

type Props = {
    params: Promise<{username: string}>;
};

/**
 * Intentionally returns no params.
 *
 * Its presence is what matters: a dynamic route without `generateStaticParams` is absent
 * from the prerender manifest entirely and gets no Full Route Cache — it re-renders on
 * every request. Declaring it registers the route as ISR-capable with a blocking
 * fallback, so each username renders once on first visit and is then served from cache.
 *
 * The list is empty on purpose. There are ~2400 players and the long tail gets no
 * traffic; prerendering them all would cost thousands of queries per build to produce
 * pages nobody opens.
 */
export async function generateStaticParams() {
    return [];
}

export default async function PlayerPage({params}: Props) {
    const {username} = await params;

    // Returns null only for a genuine miss; infrastructure failures throw so a transient
    // error is never cached as a permanent 404.
    const detail = await getCachedPlayerDetail(username);
    if (!detail) {
        notFound();
    }

    return <PlayerDetailPage detail={detail} />;
}
