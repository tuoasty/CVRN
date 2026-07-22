import type { MetadataRoute } from "next";

/**
 * `/players/<username>` is disallowed on cost grounds, not privacy.
 *
 * That route declares `generateStaticParams: []`, so no player page is prebuilt and the
 * first request for each one is a cold render — an invocation, an ISR write, and origin
 * transfer. There are ~2400 of them, and the nightly sync crons purge the `players` tag,
 * so an unrestricted crawler re-pays for the entire surface every day. Nothing about that
 * traffic corresponds to a human visit.
 *
 * The trailing slash matters: it blocks the detail pages while leaving `/players` (the
 * search page) indexable. Profiles stay reachable — links still work when clicked or
 * shared — they just stop being enumerable by bots. The only real loss is a player
 * googling their own username, which is not how anyone arrives here.
 *
 * `/admin` and `/auth` are disallowed for the ordinary reason: they are useless to a
 * search index and every crawl is a wasted dynamic render.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/players/", "/admin/", "/auth/"],
            },
        ],
    };
}
