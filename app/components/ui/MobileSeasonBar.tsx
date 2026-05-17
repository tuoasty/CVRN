"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import RegionSeasonSelector from "@/app/components/ui/RegionSeasonSelector";

export default function MobileSeasonBar() {
    const pathname = usePathname();
    if (pathname === "/home") return null;
    return (
        <div className="lg:hidden border-b border-border bg-card">
            <div className="page-wide py-2">
                <Suspense fallback={<div className="h-9" />}>
                    <RegionSeasonSelector />
                </Suspense>
            </div>
        </div>
    );
}
