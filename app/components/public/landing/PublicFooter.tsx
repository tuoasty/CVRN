"use client";

import {usePathname} from "next/navigation";
import {Code2, ExternalLink, MessageSquare, Users} from "lucide-react";
import Link from "next/link";

const STAFF = [
    { name: "CertifiedEddy", role: "Owner"},
    { name: "DivKenma", role: "Co-Owner"},
    { name: "curse", role: "Co-Owner" },
    { name: "sonny", role: "AS Commissioner" },
    { name: "Hunter", role: "NA Commissioner" },
    { name: "tee", role: "EU Commissioner" },
    { name: "thor", role: "SA Commissioner" },

];

export default function PublicFooter() {
    const pathname = usePathname();
    if (pathname === "/playoffs") return null;
    return (
        <footer className="border-t border-border bg-card">
            <div className="page-wide py-10 grid grid-cols-1 md:grid-cols-3 gap-8">

                {}
                <div className="space-y-4">
                    <div className="border-l-4 border-l-primary/40 pl-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Game</p>
                        <p className="text-sm font-bold">Confederate Volleyball Roblox</p>
                        <p className="text-xs text-muted-foreground">CVR: Retro</p>
                    </div>

                    <div className="space-y-2">
                        <a
                            href="https://www.roblox.com/games/79010415692181/CVR-Retro"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            Roblox Game Page
                        </a>

                        <a
                            href="https://discord.gg/bXtNACsuWF"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            <MessageSquare className="h-3 w-3 shrink-0" />
                            Main Discord
                        </a>

                        <a
                            href="https://discord.gg/TyfDzSPhRz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            <MessageSquare className="h-3 w-3 shrink-0" />
                            Asia Discord
                        </a>
                    </div>
                </div>

                {}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Ownership
                        </p>
                    </div>

                    <div className="space-y-2">
                        {STAFF.map((member) => (
                            <div key={member.name} className="flex items-center justify-between">
                                <span className="text-xs font-medium">{member.name}</span>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                        {member.role}
                                    </span>
                            </div>
                        ))}
                    </div>
                </div>

                {}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Code2 className="h-3.5 w-3.5 text-primary" />
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Creator
                        </p>
                    </div>

                    <div className="panel p-3 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                        <p className="text-xs font-semibold">toast</p>
                        <p className="text-[10px] text-muted-foreground tracking-wide">@tuoasty</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                            Designer & developer of CVRN.net.
                        </p>
                    </div>

                    <div className="pt-2 border-t border-border/50">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            Hero Banner Design
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                            by <span className="font-medium text-foreground/80">nightmoon (@nightmoon_vb)</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-t border-border">
                <div className="page-wide py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    © 2025 CVRN · Confederate Volleyball Roblox Network
                </p>

                <Link
                    href="/select"
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
                >
                    League Hub →
                </Link>
                </div>
            </div>
        </footer>
    )
}