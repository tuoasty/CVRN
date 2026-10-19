"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { INFORMATION_SEGMENTS, activeSegment } from "./segments"

const ITEM = "text-sm font-medium uppercase tracking-[0.05em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"

export default function InformationPicker() {
    const active = activeSegment(usePathname())

    return (
        <nav aria-label="Information">
            <div className="mb-10 hidden items-center justify-center sm:flex">
                {INFORMATION_SEGMENTS.map((segment, i) => {
                    const selected = segment.key === active
                    return (
                        <Fragment key={segment.key}>
                            {i > 0 && <span aria-hidden className="mx-3.5 text-border">/</span>}
                            <Link
                                href={segment.href}
                                aria-current={selected ? "page" : undefined}
                                className={cn(
                                    ITEM,
                                    "px-1",
                                    selected
                                        ? "font-semibold text-foreground underline decoration-2 underline-offset-8"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {segment.label}
                            </Link>
                        </Fragment>
                    )
                })}
            </div>
            <div className="mb-6 grid grid-cols-2 bg-muted/45 sm:hidden">
                {INFORMATION_SEGMENTS.map(segment => {
                    const selected = segment.key === active
                    return (
                        <Link
                            key={segment.key}
                            href={segment.href}
                            aria-current={selected ? "page" : undefined}
                            className={cn(
                                ITEM,
                                "py-2.5 text-center",
                                selected
                                    ? "bg-background font-semibold text-foreground shadow-[inset_0_-2px_0_hsl(var(--foreground))]"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {segment.label}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
