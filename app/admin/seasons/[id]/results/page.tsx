"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useParams, useRouter} from "next/navigation";
import {ChevronLeft} from "lucide-react";
import {
    fetchChampionRosterAwardsAction,
    getSeasonAllStarTeamsAction,
    getSeasonAwardsAction,
    getSeasonByIdAction,
    getSeasonPodiumAction,
    upsertSeasonAllStarTeamNameAction,
} from "@/app/actions/season.actions";
import {getSpecCatalogAction, getSpecWinnersAction} from "@/app/actions/spec.actions";
import {useRegions} from "@/app/hooks/useRegions";
import {AllStarTeamCode, SeasonAllStarTeam, SeasonAwardEntryWithPlayer, SeasonPodiumEntryWithTeam} from "@/server/domains/season";
import {getSeasonStatus} from "@/server/domains/season/helpers/getSeasonStatus";
import {SpecWinnerWithRefs} from "@/server/domains/spec";
import {Season, Spec} from "@/shared/types/db";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";
import ChampionGfxBlock from "@/app/features/seasons/ChampionGfxBlock";
import ConfirmDialog from "@/app/features/spec/catalog/ConfirmDialog";
import {useLeaveGuard} from "@/app/features/spec/catalog/useLeaveGuard";
import {ResultsCommandBar} from "@/app/features/seasons/results/ResultsCommandBar";
import {PlacementsSection} from "@/app/features/seasons/results/PlacementsSection";
import {SpecWinnersSection, mergeSpecWinner} from "@/app/features/seasons/results/SpecWinnersSection";
import {AwardRows} from "@/app/features/seasons/results/AwardRows";
import {AllStarColumns} from "@/app/features/seasons/results/AllStarColumns";
import {ChampionRosterColumns} from "@/app/features/seasons/results/ChampionRosterColumns";
import {useStagedAwards} from "@/app/features/seasons/results/useStagedAwards";
import {useAwardEditor} from "@/app/features/seasons/results/useAwardEditor";
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

function useStickyOffset() {
    const [top, setTop] = useState(0);
    useEffect(() => {
        const header = document.querySelector("header");
        if (!header) return;
        const update = () => setTop(header.getBoundingClientRect().height);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(header);
        return () => observer.disconnect();
    }, []);
    return top;
}

function ResultsSkeleton() {
    return (
        <div aria-hidden className="space-y-6 motion-safe:animate-pulse">
            <div className="h-24 border border-border bg-card" />
            <div className="grid gap-x-10 gap-y-8 lg:grid-cols-3">
                {[0, 1, 2].map(col => (
                    <div key={col} className="space-y-2">
                        <div className="h-5 w-32 bg-muted" />
                        {[0, 1, 2, 3, 4].map(row => <div key={row} className="h-8 bg-muted/50" />)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SeasonResultsPage() {
    const params = useParams();
    const router = useRouter();
    const seasonId = params.id as string;
    const {regions} = useRegions();
    const stickyTop = useStickyOffset();

    const [loading, setLoading] = useState(true);
    const [season, setSeason] = useState<Season | null>(null);
    const [podium, setPodium] = useState<SeasonPodiumEntryWithTeam[]>([]);
    const [awards, setAwards] = useState<SeasonAwardEntryWithPlayer[]>([]);
    const [allStarTeams, setAllStarTeams] = useState<SeasonAllStarTeam[]>([]);
    const [specs, setSpecs] = useState<Spec[]>([]);
    const [specWinners, setSpecWinners] = useState<SpecWinnerWithRefs[]>([]);
    const [fetchingRoster, setFetchingRoster] = useState(false);
    const [leaveTo, setLeaveTo] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getSeasonByIdAction({seasonId}),
            getSeasonPodiumAction({seasonId}),
            getSeasonAwardsAction({seasonId}),
            getSeasonAllStarTeamsAction({seasonId}),
            getSpecCatalogAction(),
            getSpecWinnersAction(seasonId),
        ])
            .then(([sRes, pRes, aRes, asRes, specRes, winRes]) => {
                if (cancelled) return;
                if (sRes.ok) setSeason(sRes.value);
                if (pRes.ok) setPodium(pRes.value);
                if (aRes.ok) setAwards(aRes.value);
                if (asRes.ok) setAllStarTeams(asRes.value);
                if (specRes.ok) setSpecs(specRes.value);
                if (winRes.ok) setSpecWinners(winRes.value);
            })
            .catch(err => clientLogger.error("SeasonResultsPage", "Initial load failed", {err}))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [seasonId]);

    const refreshAwards = useCallback(async () => {
        const res = await getSeasonAwardsAction({seasonId});
        if (res.ok) setAwards(res.value);
    }, [seasonId]);

    const onSpecSaved = useCallback((winner: SpecWinnerWithRefs) => setSpecWinners(prev => mergeSpecWinner(prev, winner)), []);
    const bar = useStagedAwards({seasonId, awards, onAwardsSaved: setAwards, onSpecSaved});
    const editor = useAwardEditor({awards, setAwards, refreshAwards, onRemoved: bar.stopEdit});

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

    const regionCode = season ? regions.find(r => r.id === season.region_id)?.code.toUpperCase() : undefined;
    const champions = podium.filter(p => p.place === 1).map(p => p.teams.name);
    const editingId = bar.editing?.id ?? null;
    const stagedAwards = bar.staged.filter(isStagedAward);
    const stagedSpecs = bar.staged.filter(isStagedSpec);
    const awardableSpecs = useMemo(() => specs.filter(s => !s.is_vaulted), [specs]);
    const winnerBySpec = useMemo(() => new Map(specWinners.map(w => [w.spec_id, w.player.username])), [specWinners]);
    const armedCategory = bar.editing ? null : bar.target.category;

    return (
        <div className="admin-container">
            <div className="mb-4">
                <Link
                    href="/admin/seasons"
                    className="inline-flex items-center gap-1 rounded-md text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
                >
                    <ChevronLeft className="size-3.5" />
                    Seasons
                </Link>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {season ? `${regionCode ? `${regionCode} · ` : ""}${season.name} Results` : loading ? "Season results" : "Season not found"}
                    </h1>
                    {season && <span className="text-sm text-muted-foreground">{statusMeta(season)}</span>}
                </div>
            </div>

            {loading ? (
                <ResultsSkeleton />
            ) : !season ? (
                <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    This season could not be loaded. Go back to Seasons and pick it again.
                </p>
            ) : (
                <div className="space-y-6">
                    <ResultsCommandBar
                        seasonId={seasonId}
                        bar={bar}
                        editor={editor}
                        awards={awards}
                        allStarTeams={allStarTeams}
                        specs={awardableSpecs}
                        winnerBySpec={winnerBySpec}
                        stickyTop={stickyTop}
                    />

                    <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
                        <div className="min-w-0 space-y-8">
                            <PlacementsSection seasonId={seasonId} podium={podium} setPodium={setPodium} />
                            <ChampionGfxBlock seasonId={seasonId} seasonName={season.name} />
                            <SpecWinnersSection
                                seasonId={seasonId}
                                winners={specWinners}
                                setWinners={setSpecWinners}
                                staged={stagedSpecs}
                                armed={armedCategory === "spec"}
                                onAdd={() => bar.arm({category: "spec"})}
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

                        <div className="min-w-0 space-y-8">
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
                            <ChampionRosterColumns
                                roster={sortRoster(awards)}
                                championName={champions.length > 0 ? champions.join(", ") : null}
                                fetching={fetchingRoster}
                                onRefetch={handleFetchRoster}
                                refreshingId={editor.refreshingId}
                                onRefreshAvatar={editor.refreshAvatar}
                            />
                        </div>
                    </div>
                </div>
            )}

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
