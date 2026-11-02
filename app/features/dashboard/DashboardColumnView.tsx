import type { DashboardRound } from "@/server/domains/admin";
import DashboardRoundBlock from "@/app/features/dashboard/DashboardRoundBlock";

interface DashboardColumnViewProps {
    regionCode: string;
    seasonId: string;
    seasonName: string;
    teamCount: number | null;
    rounds: DashboardRound[];
    failed?: boolean;
    onChanged: () => void;
}

export default function DashboardColumnView({ regionCode, seasonId, seasonName, teamCount, rounds, failed, onChanged }: DashboardColumnViewProps) {
    return (
        <section className="min-w-0" aria-label={`${regionCode} ${seasonName}`}>
            <header className="sticky top-[61px] z-10 flex items-baseline gap-2.5 border-b border-border bg-background pb-2 pt-2.5 lg:top-[53px]">
                <span className="font-mono text-lg font-semibold">{regionCode}</span>
                <span className="min-w-0 truncate text-muted-foreground" title={seasonName}>{seasonName}</span>
                {teamCount !== null && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{teamCount}</span>
                        {teamCount === 1 ? " team" : " teams"}
                    </span>
                )}
            </header>

            {rounds.length > 0 ? (
                rounds.map(round => <DashboardRoundBlock key={round.key} round={round} seasonId={seasonId} onChanged={onChanged} />)
            ) : !failed ? (
                <div className="flex min-h-60 items-center justify-center px-6 text-center text-muted-foreground">
                    No matches within this window.
                </div>
            ) : null}
        </section>
    );
}
