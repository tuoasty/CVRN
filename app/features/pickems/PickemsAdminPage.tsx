"use client";

import {useEffect, useMemo, useState} from "react";
import {Button} from "@/app/components/ui/button";
import {ViewTabs} from "@/app/components/filters/ViewTabs";
import ConfirmDialog from "@/app/features/spec/catalog/ConfirmDialog";
import {useAdminContextStore} from "@/app/stores/adminContextStore";
import {useSeasons} from "@/app/hooks/useSeasons";
import {useRegions} from "@/app/hooks/useRegions";
import {
    previewPickemSettlement,
    publishPickemMatches,
    refundPickemMarkets,
    settlePickemMatches,
    updatePickemSettings,
    usePickemBoard,
} from "@/app/hooks/usePickemBoard";
import {getRegionTimezone} from "@/app/utils/timezoneOptions";
import {toast} from "@/app/utils/toast";
import type {PickemMatchRow, PickemSettingsInput, PickemSettlePreview} from "@/server/domains/pickem";
import {PickemMatchTable} from "./PickemMatchTable";
import {PickemSettingsForm} from "./PickemSettingsForm";
import {PickemSettleDialog} from "./PickemSettleDialog";
import {BULK_PUBLISH_DAYS, bulkPublishCandidates, matchTitle, openMarketIds, settleCandidates} from "./pickemFormat";

type SettleState = {rows: PickemMatchRow[]; preview: PickemSettlePreview | null; error: string | null};

type View = "matches" | "settings";

const TABS = [
    {value: "matches" as const, label: "Matches"},
    {value: "settings" as const, label: "Settings"},
];

function useMinuteClock(): Date {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 60 * 1000);
        return () => window.clearInterval(id);
    }, []);
    return now;
}

function BoardSkeleton() {
    return (
        <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading matches">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse bg-muted/40 motion-reduce:animate-none" />
            ))}
        </div>
    );
}

export default function PickemsAdminPage() {
    const {selectedSeasonId} = useAdminContextStore();
    const {seasons} = useSeasons();
    const {regions} = useRegions();
    const season = seasons.find(s => s.id === selectedSeasonId) ?? null;
    const region = season ? regions.find(r => r.id === season.region_id) ?? null : null;

    const {board, isLoading, error} = usePickemBoard(selectedSeasonId);
    const now = useMinuteClock();
    const [view, setView] = useState<View>("matches");
    const [pending, setPending] = useState<PickemMatchRow[] | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [settling, setSettling] = useState<SettleState | null>(null);
    const [settleBusy, setSettleBusy] = useState(false);
    const [refunding, setRefunding] = useState<PickemMatchRow | null>(null);
    const [refundBusy, setRefundBusy] = useState(false);

    const candidates = useMemo(() => (board ? bulkPublishCandidates(board.matches, now) : []), [board, now]);
    const settleable = useMemo(() => (board ? settleCandidates(board.matches) : []), [board]);

    if (!selectedSeasonId) {
        return (
            <div className="page-wide py-6">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pickems</h1>
                <p className="py-16 text-center text-sm text-muted-foreground">Select a season in the navbar to manage pickems.</p>
            </div>
        );
    }

    const handlePublish = async () => {
        if (!pending || !selectedSeasonId) return;
        setPublishing(true);
        try {
            const result = await publishPickemMatches(selectedSeasonId, pending.map(r => r.matchId));
            if (!result.ok) {
                toast.error("Publish failed", result.error.message);
                return;
            }
            toast.success(pending.length === 1 ? `Published ${matchTitle(pending[0])}` : `Published ${pending.length} matches`);
            setPending(null);
        } finally {
            setPublishing(false);
        }
    };

    const openSettle = async (rows: PickemMatchRow[]) => {
        const matchIds = rows.map(r => r.matchId);
        setSettling({rows, preview: null, error: null});
        const result = await previewPickemSettlement(selectedSeasonId, matchIds);
        setSettling(current => {
            if (!current || current.rows !== rows) return current;
            return result.ok ? {...current, preview: result.value} : {...current, error: result.error.message};
        });
    };

    const handleSettle = async () => {
        if (!settling) return;
        setSettleBusy(true);
        try {
            const result = await settlePickemMatches(selectedSeasonId, settling.rows.map(r => r.matchId));
            if (!result.ok) {
                toast.error("Settle failed", result.error.message);
                return;
            }
            toast.success(settling.rows.length === 1 ? `Settled ${matchTitle(settling.rows[0])}` : `Settled ${settling.rows.length} matches`);
            setSettling(null);
        } finally {
            setSettleBusy(false);
        }
    };

    const handleRefund = async () => {
        if (!refunding) return;
        setRefundBusy(true);
        try {
            const result = await refundPickemMarkets(selectedSeasonId, refunding.matchId, openMarketIds(refunding));
            if (!result.ok) {
                toast.error("Refund failed", result.error.message);
                return;
            }
            toast.success(`Refunded ${matchTitle(refunding)}`);
            setRefunding(null);
        } finally {
            setRefundBusy(false);
        }
    };

    const handleSaveSettings = async (input: PickemSettingsInput): Promise<boolean> => {
        const result = await updatePickemSettings(selectedSeasonId, input);
        if (!result.ok) {
            toast.error("Settings not saved", result.error.message);
            return false;
        }
        toast.success("Pickem settings saved");
        return true;
    };

    const timeZone = getRegionTimezone(region?.code ?? "");

    return (
        <div className="page-wide py-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pickems</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
                {season && region ? `${season.name} · ${region.name}` : "Loading season"}
            </p>

            <ViewTabs label="Pickems view" idBase="pickems" tabs={TABS} value={view} onChange={setView} className="mt-5">
                {view === "matches" && board && (
                    <div className="mb-1.5 flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-11 rounded-sm md:h-8"
                            disabled={settleable.length === 0}
                            onClick={() => openSettle(settleable)}
                        >
                            Settle completed ({settleable.length})
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="h-11 rounded-sm md:h-8"
                            disabled={candidates.length === 0}
                            onClick={() => setPending(candidates)}
                        >
                            Publish next {BULK_PUBLISH_DAYS} days ({candidates.length})
                        </Button>
                    </div>
                )}
            </ViewTabs>

            <div id="pickems-panel" role="tabpanel" aria-labelledby={`pickems-tab-${view}`}>
                {error && (
                    <p className="py-16 text-center text-sm text-destructive">Pickems failed to load: {error}</p>
                )}
                {!error && isLoading && <BoardSkeleton />}
                {!error && board && view === "matches" && (
                    board.matches.length === 0 ? (
                        <p className="py-16 text-center text-sm text-muted-foreground">
                            No upcoming matches in this season. Matches appear here once they are on the schedule.
                        </p>
                    ) : (
                        <div className="mt-4">
                            <PickemMatchTable
                                rows={board.matches}
                                timeZone={timeZone}
                                now={now}
                                onPublish={row => setPending([row])}
                                onSettle={row => openSettle([row])}
                                onRefund={setRefunding}
                            />
                        </div>
                    )
                )}
                {!error && board && view === "settings" && (
                    <div className="mt-6">
                        <PickemSettingsForm settings={board.settings} onSave={handleSaveSettings} />
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={pending !== null}
                title={pending && pending.length === 1 ? "Publish this match?" : `Publish ${pending?.length ?? 0} matches?`}
                description={
                    <>
                        {pending && pending.length === 1
                            ? <><strong>{matchTitle(pending[0])}</strong> opens a winner and a match length market.</>
                            : <>Each match opens a winner and a match length market.</>}
                        {" "}Opening odds use the current team ratings and settings. Picks lock at the scheduled start. A published market cannot be removed yet.
                    </>
                }
                cancelLabel="Cancel"
                confirmLabel={publishing ? "Publishing..." : "Publish"}
                busy={publishing}
                onCancel={() => setPending(null)}
                onConfirm={handlePublish}
            />

            <PickemSettleDialog
                open={settling !== null}
                count={settling?.rows.length ?? 0}
                preview={settling?.preview ?? null}
                error={settling?.error ?? null}
                busy={settleBusy}
                onCancel={() => setSettling(null)}
                onConfirm={handleSettle}
            />

            <ConfirmDialog
                open={refunding !== null}
                title="Refund this match?"
                description={
                    <>
                        Every pick on <strong>{refunding ? matchTitle(refunding) : ""}</strong> gets its stake back. Its open markets close for good, and the match cannot be published again.
                    </>
                }
                cancelLabel="Cancel"
                confirmLabel={refundBusy ? "Refunding..." : "Refund stakes"}
                destructive
                busy={refundBusy}
                onCancel={() => setRefunding(null)}
                onConfirm={handleRefund}
            />
        </div>
    );
}
