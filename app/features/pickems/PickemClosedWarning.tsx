"use client";

import {usePickemMatchSettlement} from "@/app/hooks/usePickemBoard";
import {cn} from "@/lib/utils";

export function PickemClosedWarning({matchId, enabled, action, className}: {matchId: string; enabled: boolean; action: "void" | "edit"; className?: string}) {
    const settlement = usePickemMatchSettlement(matchId, enabled);
    if (!settlement || settlement.settled + settlement.refunded === 0) return null;
    return (
        <p role="note" className={cn("text-sm text-destructive", className)}>
            Pickems on this match are already settled or refunded. {action === "void" ? "Voiding" : "Changing the result"} does not change what players were paid.
        </p>
    );
}
