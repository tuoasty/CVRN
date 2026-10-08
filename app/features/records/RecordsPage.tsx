"use client";

import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {OptionRow} from "@/app/components/filters/OptionRow";
import {ViewTabs, viewPanelId, viewTabId} from "@/app/components/filters/ViewTabs";
import {InlineSwitch} from "@/app/components/filters/InlineSwitch";
import {REGION_ORDER} from "@/app/features/leaderboard/useLeaderboardFilters";
import type {RecordGrain, RecordSubject, RecordsPayload} from "@/server/domains/record";
import {RecordCategory} from "./RecordCategory";
import {
    buildRecordsHref,
    nextScopeForRegion,
    seasonsForRegion,
    type RecordSeasonOption,
} from "./recordScopeParams";

const GRAINS: {value: RecordGrain; label: string}[] = [
    {value: "set", label: "Single Set"},
    {value: "match", label: "Single Match"},
    {value: "season", label: "Season"},
];

const SUBJECTS: {value: RecordSubject; label: string}[] = [
    {value: "player", label: "Players"},
    {value: "team", label: "Teams"},
];

const REGION_OPTIONS = REGION_ORDER.map(code => ({value: code as string, label: code}));

const TABS_ID = "records-grain";

type Props = {
    payload: RecordsPayload;
    seasonOptions: RecordSeasonOption[];
    region: string | null;
    season: number | null;
};

export default function RecordsPage({payload, seasonOptions, region, season}: Props) {
    const router = useRouter();
    const [grain, setGrain] = useState<RecordGrain>("set");
    const [subject, setSubject] = useState<RecordSubject>("player");

    const goTo = (next: {region: string | null; season: number | null}) => {
        router.push(buildRecordsHref(next.region, next.season));
    };

    const seasonRowOptions = seasonsForRegion(seasonOptions, region).map(option => ({
        value: String(option.number),
        label: String(option.number),
        title: `Season ${option.number}`,
    }));

    const scope = payload.scope;
    const groups = payload.book[subject][grain];

    return (
        <div className="page-wide pb-20 pt-7">
            <h1 className="text-2xl font-semibold tracking-[-0.025em]">Records</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
                Best single-set, single-match and season performances in tracked playoff matches.
            </p>

            <div className="mt-5 grid grid-cols-[72px_minmax(0,1fr)] items-center gap-y-1">
                <OptionRow
                    label="Region"
                    allOption={{label: "All"}}
                    options={REGION_OPTIONS}
                    value={region ? region.toUpperCase() : null}
                    onChange={next => goTo(nextScopeForRegion(seasonOptions, next, season))}
                />
                <OptionRow
                    label="Season"
                    mono
                    allOption={{label: "All"}}
                    options={seasonRowOptions}
                    value={season === null ? null : String(season)}
                    onChange={next => goTo({region, season: next === null ? null : Number(next)})}
                />
            </div>

            <ViewTabs
                className="mt-6"
                label="Record type"
                idBase={TABS_ID}
                tabs={GRAINS}
                value={grain}
                onChange={setGrain}
                wrapToolsBelow="sm"
                toolsClassName="sm:pb-2"
            >
                <div className="flex items-center gap-5">
                    {grain === "season" && scope.kind === "season" && (
                        <Link
                            href={`/${scope.regionCode.toLowerCase()}/${scope.seasonSlug}/leaderboard`}
                            className="text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            Full {scope.regionCode} Season{" "}
                            <span className="font-mono tabular-nums">{scope.seasonNumber}</span> leaderboard{" "}
                            <span aria-hidden>→</span>
                        </Link>
                    )}
                    <InlineSwitch label="Record subject" options={SUBJECTS} value={subject} onChange={setSubject} />
                </div>
            </ViewTabs>

            <div id={viewPanelId(TABS_ID)} role="tabpanel" aria-labelledby={viewTabId(TABS_ID, grain)} className="mt-8">
                {groups.length === 0 ? (
                    <p className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
                        No tracked matches in this scope yet.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-x-12 gap-y-11 md:grid-cols-2 xl:grid-cols-3">
                        {groups.map(group => (
                            <RecordCategory key={group.category} group={group} />
                        ))}
                    </div>
                )}
            </div>

            <p className="mt-12 border-t border-border pt-3 text-xs text-muted-foreground">
                Records from tracked playoff matches. Forfeits and voided matches are excluded.
            </p>
        </div>
    );
}
