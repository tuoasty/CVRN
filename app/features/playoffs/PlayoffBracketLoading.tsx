import {Loader2} from "lucide-react";

// Single loading treatment shared by the route fallback (loading.tsx), the
// bracket-fetch state (PlayoffsPage), and the teams/matches-fetch state
// (PlayoffBracketDisplay). It wears the real bracket's panel frame so the cold
// load reads as one continuous state that resolves into the bracket, instead of
// flipping between a card skeleton and a spinner. The bracket's real dimensions
// are data-driven and unknowable ahead of load, so a shape-matching skeleton
// would always mis-reserve space (CLS); a framed indicator is the honest choice.
export function PlayoffBracketLoading() {
    return (
        <div className="panel overflow-hidden rounded-sm border-l-4 border-l-primary/30">
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground" role="status">
                    Loading bracket…
                </p>
            </div>
        </div>
    );
}
