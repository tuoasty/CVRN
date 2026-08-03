import {Loader2} from "lucide-react";

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
