import {ResultsHeader, ResultsSkeleton} from "@/app/features/seasons/results/SeasonResultsView";

export default function SeasonResultsLoading() {
    return (
        <div className="admin-container" aria-busy="true">
            <ResultsHeader title="Season results" />
            <ResultsSkeleton />
        </div>
    );
}
