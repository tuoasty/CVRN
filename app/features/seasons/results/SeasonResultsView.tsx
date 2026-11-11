"use client";

import {useCallback, useMemo, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ChevronLeft} from "lucide-react";
import {
    fetchChampionRosterAwardsAction,
    getSeasonAwardsAction,
    upsertSeasonAllStarTeamNameAction,
} from "@/app/actions/season.actions";
import {AllStarTeamCode, SeasonResultsPageData} from "@/server/domains/season";
import {getSeasonStatus} from "@/server/domains/season/helpers/getSeasonStatus";
import {SpecWinnerWithRefs} from "@/server/domains/spec";
import {Season} from "@/shared/types/db";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";
import ChampionGfxBlock from "@/app/features/seasons/ChampionGfxBlock";
import { useHasGroup } from "@/app/admin/AdminRoleProvider";
import ConfirmDialog from "@/app/features/spec/catalog/ConfirmDialog";
import {useLeaveGuard} from "@/app/features/spec/catalog/useLeaveGuard";
import {ResultsCommandBar} from "@/app/features/seasons/results/ResultsCommandBar";
import {PlacementsSection} from "@/app/features/seasons/results/PlacementsSection";
import {SpecWinnersSection, mergeSpecWinner} from "@/app/features/seasons/results/SpecWinnersSection";
import {AwardRows} from "@/app/features/seasons/results/AwardRows";
import {AllStarColumns} from "@/app/features/seasons/results/AllStarColumns";
import {ChampionRosterColumns} from "@/app/features/seasons/results/ChampionRosterColumns";
import {useStickyOffset} from "@/app/hooks/useStickyOffset";
import {useStagedAwards} from "@/app/features/seasons/results/useStagedAwards";
import {useAwardEditor} from "@/app/features/seasons/results/useAwardEditor";
import {useSpecWinnerEditor} from "@/app/features/seasons/results/useSpecWinnerEditor";
import {awardsIn, sortRoster} from "@/app/features/seasons/results/awardGroups";
import {isStagedAward, isStagedSpec} from "@/app/features/seasons/results/types";

function formatDay(value: string) {
    return new Date(value).toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"});
}

function statusMeta(season: Season) {
    const status = getSeasonStatus(season);
    if (status === "ended" && season.end_date) return `Ended ${formatDay(season.end_date)}`;
    if (status === "upcoming") return `Starts ${formatDay(season.start_date)}`;
    return season.end_date ? `In progress · ends ${formatDay(season.end_date)}` : "In progress";
}

export type SeasonResultsData = SeasonResultsPageData;

export function ResultsHeader({title, meta}: {title: string; meta?: string}) {
    return (
        <div className="mb-4">
            <Link
                href="/admin/seasons"
                className="inline-flex items-center gap-1 rounded-md text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
            >
                <ChevronLeft className="size-3.5" />
                Seasons
            </Link>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
            </div>
        </div>
    );
}

export function ResultsSkeleton() {
    return (
        <div aria-hidden className="space-y-6 motion-safe:animate-pulse">
            <div className="h-28 border border-border bg-card" />
            <div className="grid gap-x-10 gap-y-8 lg:grid-cols-3">
                {[0, 1, 2].map(col => (
                    <div key={col} className="space-y-2">
                        <div className="h-5 w-32 bg-muted" />
                        {[0, 1, 2, 3, 4, 5].map(row => <div key={row} className="h-8 bg-muted/50" />)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SeasonResultsView({seasonId, initial}: {seasonId: string; initial: SeasonResultsData}) {
    const router = useRouter();
    const stickyTop = useStickyOffset();
    const canChampionGfx = useHasGroup("admin", "graphics");
    const {season, regionCode} = initial;

    const [podium, setPodium] = useState(initial.podium);
    const [awards, setAwards] = useState(initial.awards);
    const [allStarTeams, setAllStarTeams] = useState(initial.allStarTeams);
    const [specWinners, setSpecWinners] = useState(initial.specWinners);
    const [fetchingRoster, setFetchingRoster] = useState(false);
    const [leaveTo, setLeaveTo] = useState<string | null>(null);
    const specs = initial.specs;

    const refreshAwards = useCallback(async () => {
        const res = await getSeasonAwardsAction({seasonId});
        if (res.ok) setAwards(res.value);
    }, [seasonId]);

    const onSpecSaved = useCallback((winner: SpecWinnerWithRefs) => setSpecWinners(prev => mergeSpecWinner(prev, winner)), []);
    const bar = useStagedAwards({seasonId, awards, specWinners, initialSuggestions: initial.suggestions, onAwardsSaved: setAwards, onSpecSaved});
    const editor = useAwardEditor({awards, setAwards, refreshAwards, onRemoved: bar.stopEdit, awardList: bar.awardList});
    const editingSpecId = bar.editingSpec?.id ?? null;
    const stopEdit = bar.stopEdit;
    const onSpecRemoved = useCallback((winnerId: string) => {
        if (winnerId === editingSpecId) stopEdit();
    }, [editingSpecId, stopEdit]);
    const specEditor = useSpecWinnerEditor({seasonId, winners: specWinners, setWinners: setSpecWinners, onRemoved: onSpecRemoved});

    const blockLeave = useCallback((href: string) => setLeaveTo(href), []);
    useLeaveGuard(bar.staged.length > 0, blockLeave);

    const handleFetchRoster = async () => {
        setFetchingRoster(true);
        try {
            const result = await fetchChampionRosterAwardsAction({seasonId});
            if (!result.ok) { toast.error("Failed to fetch champion roster", result.error.message); return; }
            if (result.value.skipped) {
                toast.info("No champion found. Set 1st place first.");
                return;
            }
            await refreshAwards();
            toast.success(`Champion roster saved (${result.value.count} players)`);
        } catch (err) {
            clientLogger.error("SeasonResultsPage", "Error fetching champion roster", {err});
            toast.error("Something went wrong");
        } finally {
            setFetchingRoster(false);
        }
    };

    const handleRenameAllStarTeam = async (code: AllStarTeamCode, name: string) => {
        const result = await upsertSeasonAllStarTeamNameAction({seasonId, code, name});
        if (!result.ok) { toast.error("Failed to rename All-Star team", result.error.message); return; }
        setAllStarTeams(prev => [...prev.filter(t => t.code !== code), result.value]);
    };

    const champions = podium.filter(p => p.place === 1).map(p => p.teams.name);
    const editingId = bar.editing?.id ?? null;
    const stagedAwards = bar.staged.filter(isStagedAward);
    const stagedSpecs = bar.staged.filter(isStagedSpec);
    const awardableSpecs = useMemo(() => specs.filter(s => !s.is_vaulted), [specs]);
    const winnerBySpec = useMemo(() => new Map(specWinners.map(w => [w.spec_id, w.player.username])), [specWinners]);
    const armedCategory = bar.editing || bar.editingSpec ? null : bar.target.category;

    return (
        <div className="admin-container">
            <ResultsHeader
                title={`${regionCode ? `${regionCode} · ` : ""}${season.name} Results`}
                meta={statusMeta(season)}
            />

            <div className="space-y-6">
                <ResultsCommandBar
                    seasonId={seasonId}
                    bar={bar}
                    editor={editor}
                    awards={awards}
                    allStarTeams={allStarTeams}
                    specs={awardableSpecs}
                    winnerBySpec={winnerBySpec}
                    specEditor={specEditor}
                    stickyTop={stickyTop}
                />

                <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
                    <div className="min-w-0 space-y-8">
                        <PlacementsSection seasonId={seasonId} teams={initial.teams} podium={podium} setPodium={setPodium} />
                        {canChampionGfx && <ChampionGfxBlock seasonId={seasonId} seasonName={season.name} initialPost={initial.championGfx} />}
                        <ChampionRosterColumns
                            roster={sortRoster(awards)}
                            championName={champions.length > 0 ? champions.join(", ") : null}
                            fetching={fetchingRoster}
                            onRefetch={handleFetchRoster}
                            refreshingId={editor.refreshingId}
                            onRefreshAvatar={editor.refreshAvatar}
                        />
                    </div>

                    <div className="min-w-0 space-y-8">
                        <AwardRows
                            title="Individual"
                            emptyLabel="No individual awards yet"
                            awards={awardsIn(awards, "individual_winners")}
                            staged={stagedAwards.filter(s => s.category === "individual_winners")}
                            editingId={editingId}
                            armed={armedCategory === "individual_winners"}
                            onAdd={() => bar.arm({category: "individual_winners"})}
                            onSelect={bar.startEdit}
                        />
                        <AllStarColumns
                            awards={awards}
                            staged={stagedAwards}
                            allStarTeams={allStarTeams}
                            editingId={editingId}
                            armedTeam={armedCategory === "all_star" ? bar.target.team : null}
                            onAdd={team => bar.arm({
                                category: "all_star",
                                team,
                                slot: bar.target.category === "all_star" ? bar.target.slot : "starter",
                            })}
                            onSelect={bar.startEdit}
                            refreshingId={editor.refreshingId}
                            onRefreshAvatar={editor.refreshAvatar}
                            onRenameTeam={handleRenameAllStarTeam}
                        />
                    </div>

                    <div className="min-w-0 space-y-8">
                        <SpecWinnersSection
                            winners={specWinners}
                            staged={stagedSpecs}
                            editingId={editingSpecId}
                            busyId={specEditor.busyId}
                            armed={armedCategory === "spec"}
                            onAdd={() => bar.arm({category: "spec"})}
                            onSelect={bar.startSpecEdit}
                            onRemove={specEditor.remove}
                        />
                        <AwardRows
                            title="Staff team"
                            emptyLabel="No staff awards yet"
                            awards={awardsIn(awards, "staff_team")}
                            staged={stagedAwards.filter(s => s.category === "staff_team")}
                            editingId={editingId}
                            armed={armedCategory === "staff_team"}
                            onAdd={() => bar.arm({category: "staff_team"})}
                            onSelect={bar.startEdit}
                        />
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={leaveTo !== null}
                title={`Discard ${bar.staged.length} staged award${bar.staged.length === 1 ? "" : "s"}?`}
                description="Leaving this page drops awards that have not been saved. Save first to keep them."
                cancelLabel="Keep editing"
                confirmLabel="Discard and leave"
                destructive
                onCancel={() => setLeaveTo(null)}
                onConfirm={() => {
                    const href = leaveTo;
                    setLeaveTo(null);
                    if (href) router.push(href);
                }}
            />
        </div>
    );
}
