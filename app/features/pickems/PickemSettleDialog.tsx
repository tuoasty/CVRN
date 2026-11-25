"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import type {PickemSettleMarket, PickemSettleMatch, PickemSettlePreview} from "@/server/domains/pickem";
import {cn} from "@/lib/utils";
import {formatCurrency, formatOdds, matchTitle} from "./pickemFormat";

const MARKET_TITLES: Record<PickemSettleMarket["kind"], string> = {
    winner: "Winner",
    match_length: "Match length",
};

const RESULT_LABELS = {win: "Won", loss: "Lost", refund: "Refund"} as const;

const HEAD = "py-1.5 pr-3 text-left text-xs font-semibold text-muted-foreground";
const NUM = "py-1.5 pl-3 text-right font-mono tabular-nums";

function MarketTable({market}: {market: PickemSettleMarket}) {
    return (
        <table className="w-full border-collapse text-sm">
            <caption className="pb-1 text-left text-xs font-semibold text-foreground">{MARKET_TITLES[market.kind]}</caption>
            <thead>
                <tr className="border-b border-border">
                    <th scope="col" className={HEAD}>Outcome</th>
                    <th scope="col" className={cn(HEAD, "text-right")}>Picks</th>
                    <th scope="col" className={cn(HEAD, "text-right")}>Staked</th>
                    <th scope="col" className={cn(HEAD, "text-right")}>Odds</th>
                    <th scope="col" className={cn(HEAD, "pr-0 text-right")}>Pays</th>
                </tr>
            </thead>
            <tbody>
                {market.outcomes.map(o => (
                    <tr key={o.key} className={cn(o.result === "loss" && "text-muted-foreground")}>
                        <th scope="row" className={cn("py-1.5 pr-3 text-left", o.result === "win" ? "font-semibold text-foreground" : "font-normal")}>
                            {o.label}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">{RESULT_LABELS[o.result]}</span>
                        </th>
                        <td className={NUM}>{o.picks}</td>
                        <td className={NUM}>{formatCurrency(o.staked)}</td>
                        <td className={NUM}>{o.finalOdds === null ? "" : formatOdds(o.finalOdds)}</td>
                        <td className={cn(NUM, "pr-0")}>{formatCurrency(o.payout)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function MatchPreview({match}: {match: PickemSettleMatch}) {
    return (
        <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
                {matchTitle(match)}
                {match.matchCode && <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{match.matchCode}</span>}
            </h3>
            {match.forfeit && (
                <p className="text-sm text-muted-foreground">Forfeit. Every pick gets its stake back.</p>
            )}
            {match.markets.map(market => <MarketTable key={market.marketId} market={market} />)}
        </section>
    );
}

export function PickemSettleDialog({open, count, preview, error, busy, onCancel, onConfirm}: {
    open: boolean;
    count: number;
    preview: PickemSettlePreview | null;
    error: string | null;
    busy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const net = preview ? preview.paid - preview.staked : 0;
    return (
        <AlertDialog open={open} onOpenChange={o => !o && !busy && onCancel()}>
            <AlertDialogContent className="flex max-h-[85vh] flex-col rounded-sm sm:max-w-xl">
                <AlertDialogHeader className="shrink-0">
                    <AlertDialogTitle>{count === 1 ? "Settle this match?" : `Settle ${count} matches?`}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Payouts use the match result as it stands now. Settling is final: a later void or result change does not take currency back.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1" aria-live="polite">
                    {!preview && !error && <p className="py-8 text-center text-sm text-muted-foreground">Working out payouts...</p>}
                    {error && <p className="py-8 text-center text-sm text-destructive">Preview failed: {error}</p>}
                    {preview && (
                        <div className="space-y-6">
                            {preview.matches.map(match => <MatchPreview key={match.matchId} match={match} />)}
                        </div>
                    )}
                </div>

                {preview && (
                    <dl className="flex shrink-0 flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-sm">
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground">Staked</dt>
                            <dd className="font-mono tabular-nums text-foreground">{formatCurrency(preview.staked)}</dd>
                        </div>
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground">Paid out</dt>
                            <dd className="font-mono tabular-nums text-foreground">{formatCurrency(preview.paid)}</dd>
                        </div>
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground">Currency created</dt>
                            <dd className="font-mono tabular-nums text-foreground">{net > 0 ? "+" : ""}{formatCurrency(net)}</dd>
                        </div>
                    </dl>
                )}

                <AlertDialogFooter className="shrink-0">
                    <AlertDialogCancel className="rounded-sm" disabled={busy}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="rounded-sm"
                        disabled={busy || !preview}
                        onClick={e => {
                            e.preventDefault();
                            onConfirm();
                        }}
                    >
                        {busy ? "Settling..." : "Settle and pay out"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
