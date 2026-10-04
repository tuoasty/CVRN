"use client";

import {usePathname} from "next/navigation";
import {Code2, ExternalLink, Gamepad2, MessageSquare, Users, type LucideIcon} from "lucide-react";
import Link from "next/link";

const STAFF = [
    { name: "CertifiedEddy", role: "Owner"},
    { name: "keirahela", role: "Developer"},
    { name: "curse", role: "Council" },
    { name: "Ardmair", role: "Council" },
    { name: "tee", role: "Council" },
    { name: "Aaron5959", role: "Council" },
];

const LINKS = [
    { href: "https://www.roblox.com/games/79010415692181/CVR-Retro", label: "Roblox Game Page", Icon: ExternalLink },
    { href: "https://discord.gg/bXtNACsuWF", label: "Main Discord", Icon: MessageSquare },
    { href: "https://discord.gg/TyfDzSPhRz", label: "Asia Discord", Icon: MessageSquare },
];

function SectionHeader({ Icon, label }: { Icon: LucideIcon; label: string }) {
    return (
        <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {label}
            </p>
        </div>
    );
}

export default function PublicFooter() {
    const pathname = usePathname();
    if (pathname === "/playoffs") return null;
    const year = new Date().getFullYear();
    return (
        <footer className="border-t border-border bg-card">
            <div className="page-wide py-10 grid grid-cols-1 md:grid-cols-3 gap-8">

                <div className="space-y-3">
                    <SectionHeader Icon={Gamepad2} label="The Game" />
                    <div>
                        <p className="text-sm font-semibold">Confederate Volleyball Roblox</p>
                        <p className="text-xs text-muted-foreground">CVR: Retro</p>
                    </div>
                    <div className="space-y-2 pt-1">
                        {LINKS.map(({ href, label, Icon }) => (
                            <a
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                {label}
                            </a>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <SectionHeader Icon={Users} label="Ownership" />
                    <div className="space-y-2">
                        {STAFF.map((member) => (
                            <div key={member.name} className="flex items-center justify-between gap-3">
                                <span className="text-xs font-medium min-w-0 truncate">{member.name}</span>
                                <span className="text-xs uppercase tracking-wider text-muted-foreground shrink-0">
                                    {member.role}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <SectionHeader Icon={Code2} label="Creator" />
                    <div>
                        <p className="text-sm font-semibold">toast</p>
                        <p className="text-xs text-muted-foreground">@tuoasty</p>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Designer &amp; developer of CVRN.net.
                        </p>
                    </div>
                    <div className="pt-2 border-t border-border/50">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Logo Design
                        </p>
                        <p className="text-xs text-muted-foreground">
                            by <span className="font-medium text-foreground/80">CH332Y (@slayden_dirksz)</span>
                        </p>
                    </div>
                    <div className="pt-2 border-t border-border/50">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Hero Banner Design
                        </p>
                        <p className="text-xs text-muted-foreground">
                            by <span className="font-medium text-foreground/80">nightmoon (@nightmoon_vb)</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-t border-border">
                <div className="page-wide py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        © {year} CVRN · Confederate Volleyball Roblox Network
                    </p>
                    <Link
                        href="/select"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
                    >
                        League Hub →
                    </Link>
                </div>
            </div>
        </footer>
    )
}
