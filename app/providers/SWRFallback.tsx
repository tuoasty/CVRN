"use client";

import { SWRConfig } from "swr";

export function SWRFallback({
    fallback,
    children,
}: {
    fallback: Record<string, unknown>;
    children: React.ReactNode;
}) {
    // This config is inherited by EVERY SWR hook under the (public) tree, but `fallback`
    // only carries `regions` and `seasons`. So any option here must stay safe for keys
    // that have no data at all — matches, media, player search, playoff brackets.
    //
    // `revalidateIfStale: false` is the one that pays: SWR's initial-revalidation check
    // ends in `isUndefined(data) || revalidateIfStale`, so a key WITH fallback data skips
    // the fetch (saving two server-action POSTs per cold load site-wide, since
    // RegionSeasonSelector sits in the navbar) while a key WITHOUT data still fetches
    // normally.
    //
    // Do NOT add `revalidateOnMount: false` here. It short-circuits that check before the
    // data test — `if (isInitialMount && !isUndefined(revalidateOnMount)) return
    // revalidateOnMount` — which silently stops every fallback-less hook in the tree from
    // ever fetching. That blanks the matches list, the playoff bracket and the players
    // prepopulate list, with no error to point at.
    return (
        <SWRConfig
            value={{
                fallback,
                revalidateIfStale: false,
                revalidateOnReconnect: false,
            }}
        >
            {children}
        </SWRConfig>
    );
}
