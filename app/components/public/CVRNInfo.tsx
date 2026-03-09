import Link from "next/link";
import { ExternalLink } from "lucide-react";

export default function CVRNInfo() {
    return (
        <section className="bg-background border-t border-border flex flex-col items-center justify-center px-6 py-24">
            <div className="max-w-2xl w-full text-center space-y-8">

                <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
                        Confederate Volleyball Roblox
                    </p>
                    <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
                        CVRN
                    </h1>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                    The official CVR Network
                </p>

                <div className="flex items-center justify-center gap-3">
                    <Link
                        href="/home"
                        className="inline-flex items-center gap-2 h-9 px-5 rounded-sm bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider hover:bg-primary/90 transition-colors"
                    >
                        View League
                    </Link>
                    <a
                        href="https://www.roblox.com/games/114786545831333/CVR"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 h-9 px-5 rounded-sm border border-border text-xs font-semibold uppercase tracking-wider hover:bg-muted/50 transition-colors"
                    >
                    <ExternalLink className="h-3 w-3" />
                    Play CVR
                </a>
            </div>

        </div>
</section>
);
}