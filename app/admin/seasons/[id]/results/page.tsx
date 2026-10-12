"use client";

import {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {getSeasonResultsPageAction} from "@/app/actions/season.actions";
import {SeasonResultsPageData} from "@/server/domains/season";
import {clientLogger} from "@/app/utils/clientLogger";
import {ResultsHeader, ResultsSkeleton, SeasonResultsView} from "@/app/features/seasons/results/SeasonResultsView";

type LoadState = {status: "loading"} | {status: "ready"; data: SeasonResultsPageData} | {status: "failed"};

export default function SeasonResultsPage() {
    const params = useParams();
    const seasonId = params.id as string;
    const [state, setState] = useState<LoadState>({status: "loading"});

    useEffect(() => {
        let cancelled = false;
        setState({status: "loading"});
        getSeasonResultsPageAction({seasonId})
            .then(res => { if (!cancelled) setState(res.ok ? {status: "ready", data: res.value} : {status: "failed"}); })
            .catch(err => {
                clientLogger.error("SeasonResultsPage", "Initial load failed", {err});
                if (!cancelled) setState({status: "failed"});
            });
        return () => { cancelled = true; };
    }, [seasonId]);

    if (state.status === "ready") return <SeasonResultsView key={seasonId} seasonId={seasonId} initial={state.data} />;

    return (
        <div className="admin-container">
            <ResultsHeader title={state.status === "loading" ? "Season results" : "Season not found"} />
            {state.status === "loading" ? (
                <ResultsSkeleton />
            ) : (
                <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    This season could not be loaded. Go back to Seasons and pick it again.
                </p>
            )}
        </div>
    );
}
