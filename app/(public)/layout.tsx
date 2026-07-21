import { Suspense } from "react";
import PublicNavbar from "@/app/components/public/navigation/PublicNavbar";
import PublicFooter from "@/app/components/public/landing/PublicFooter";
import { SWRFallback } from "@/app/providers/SWRFallback";
import { getCachedRegions, getCachedSeasons } from "@/server/cache/publicReads";
import { logger } from "@/server/utils/logger";

/**
 * Reads go through the cached, cookie-free helpers rather than the server actions.
 *
 * This layout wraps every route under (public), and a layout's render is part of each
 * descendant's render — so the `cookies()` call inside `createServerSupabase()` used to
 * mark all ~20 public routes as dynamic, making them impossible to serve from the CDN.
 * Keep this file free of Dynamic APIs (`cookies`, `headers`, `searchParams`, …) or every
 * public page silently goes back to rendering per-request.
 */
async function PublicLayoutDataProvider({ children }: { children: React.ReactNode }) {
    // The cached readers throw rather than return an empty result, so a transient failure
    // is never written to the cache. Catch here to keep the shell rendering.
    const [regions, seasons] = await Promise.all([
        getCachedRegions().catch((error) => {
            logger.error({ error }, "PublicLayout: failed to load regions");
            return [];
        }),
        getCachedSeasons().catch((error) => {
            logger.error({ error }, "PublicLayout: failed to load seasons");
            return [];
        }),
    ]);

    return (
        <SWRFallback fallback={{ regions, seasons }}>
            <main className="flex-1">{children}</main>
        </SWRFallback>
    );
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Suspense
                fallback={
                    <header className="border-b border-border bg-card">
                        <div className="page-wide h-[52px] lg:h-[56px]" />
                        <div className="lg:hidden border-t border-border">
                            <div className="page-wide h-[52px]" />
                        </div>
                    </header>
                }
            >
                <PublicNavbar />
            </Suspense>
            <Suspense fallback={<main className="flex-1" />}>
                <PublicLayoutDataProvider>
                    {children}
                </PublicLayoutDataProvider>
            </Suspense>
            <Suspense fallback={null}>
                <PublicFooter />
            </Suspense>
        </div>
    );
}
