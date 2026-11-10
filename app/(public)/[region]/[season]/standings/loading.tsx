import {StandingsHeaderSkeleton, StandingsTableSkeleton} from "@/app/features/standings/StandingsSkeleton";

export default function StandingsLoading() {
    return (
        <div className="page-wide py-6">
            <StandingsHeaderSkeleton />
            <StandingsTableSkeleton />
        </div>
    );
}
