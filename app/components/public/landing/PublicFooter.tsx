import {Code2, ExternalLink, MessageSquare, Users} from "lucide-react";
import Link from "next/link";

const STAFF = [
    { name: "Sonny", role: "Commissioner" },
    { name: "Ard", role: "Acting Commissioner" },
    { name: "Roppy", role: "Staff" },
    { name: "Vader", role: "Staff" },
    { name: "Toast", role: "Staff" },
    { name: "Michiru", role: "Staff" },
];


export default function PublicFooter(){
    return (
        <footer className="border-t border-border bg-card">
            <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Game Info */}
                <div className="space-y-4">
                    <div className="border-l-4 border-l-primary/40 pl-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Game</p>
                        <p className="text-sm font-bold">Confederate Volleyball Roblox</p>
                        <p className="text-xs text-muted-foreground">CVR</p>
                    </div>

                    <div className="space-y-2">
                        <a
                            href="https://www.roblox.com/games/114786545831333/CVR"
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

                {/* Staff */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Staff Team
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

                {/* Creator */}
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
                            Designed & developed the CVRN league management platform.
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-t border-border px-6 py-3 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    © 2025 CVRN · Confederate Volleyball Roblox Network
                </p>

                <Link
                    href="/home"
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
                >
                    League Hub →
                </Link>
            </div>
        </footer>
    )
}