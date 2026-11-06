"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {ExternalLink} from "lucide-react";
import {cn} from "@/lib/utils";
import {LEAGUE_SHEET, SITE_LINKS, SOCIAL_LINKS} from "./footerLinks";

const LINK = "rounded-[2px] underline-offset-4 decoration-2 transition-colors duration-200 hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const HEADER = "text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground";

interface Props {
    surface?: "band" | "plain";
}

export default function SiteFooter({surface = "band"}: Props) {
    const pathname = usePathname();
    if (pathname === "/playoffs") return null;
    const year = new Date().getFullYear();

    return (
        <footer className={cn(surface === "band" && "border-t border-border bg-card")}>
            <div className="page-wide pt-12 pb-8">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
                    <div className="sm:col-span-2 lg:col-span-1">
                        <p className="text-sm font-semibold uppercase tracking-[0.14em]">CVR Network</p>
                        <p className="mt-2 max-w-sm text-sm text-muted-foreground">The hub for CVR: Retro on Roblox.</p>
                    </div>

                    <nav aria-label="Site">
                        <p className={HEADER}>CVRN</p>
                        <ul className="mt-3 text-sm text-muted-foreground">
                            {SITE_LINKS.map(link => (
                                <li key={link.href}>
                                    <Link href={link.href} prefetch={false} className={`inline-flex min-h-11 sm:min-h-9 items-center ${LINK}`}>
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div>
                        <p className={HEADER}>Community</p>
                        <ul className="mt-3 text-sm text-muted-foreground">
                            {SOCIAL_LINKS.map(link => (
                                <li key={link.label}>
                                    <a
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`inline-flex min-h-11 sm:min-h-9 items-center gap-3 ${LINK}`}
                                    >
                                        <img src={link.image} alt="" width={24} height={24} className="size-6 shrink-0 rounded-[2px] object-cover" />
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                            <li>
                                <a
                                    href={LEAGUE_SHEET.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex min-h-11 sm:min-h-9 items-center gap-2 ${LINK}`}
                                >
                                    {LEAGUE_SHEET.label}
                                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <p className="mt-10 text-xs text-muted-foreground">
                    © <span className="font-mono">{year}</span> CVRN. Not affiliated with Roblox Corporation.
                </p>
            </div>
        </footer>
    );
}
