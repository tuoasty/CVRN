"use client";

import { SWRConfig } from "swr";

export function SWRFallback({
    fallback,
    children,
}: {
    fallback: Record<string, unknown>;
    children: React.ReactNode;
}) {
    return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}
