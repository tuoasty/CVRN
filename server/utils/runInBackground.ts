import "server-only";
import {waitUntil} from "@vercel/functions";
import {logger} from "@/server/utils/logger";

export function runInBackground(fn: () => Promise<unknown>, label?: string): void {
    const promise = fn().catch((error) => {
        logger.error({error, label}, "Background task failed");
    });

    try {
        waitUntil(promise);
    } catch {
        void promise;
    }
}
