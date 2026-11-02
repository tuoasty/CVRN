import type { DashboardRound } from "@/server/domains/admin";
import { getMatchTypeLabel } from "@/app/utils/matchLabel";
import DashboardMatchLine from "@/app/features/dashboard/DashboardMatchLine";
import RoundMediaSpot from "@/app/features/dashboard/RoundMediaSpot";

function roundLabel(round: DashboardRound): string {
    if (round.week !== null) return `Week ${round.week}`;
    return getMatchTypeLabel(round.matchType, null, round.playoffRound);
}

interface DashboardRoundBlockProps {
    round: DashboardRound;
    seasonId: string;
    onChanged: () => void;
}

export default function DashboardRoundBlock({ round, seasonId, onChanged }: DashboardRoundBlockProps) {
    const hasSpots = round.week !== null || round.playoffRound !== null;

    return (
        <div className="mt-11 first-of-type:mt-4">
            <div className="flex min-h-7 items-center justify-between gap-2 border-b border-border pb-2">
                <h2 className="text-sm font-semibold">{roundLabel(round)}</h2>
                {hasSpots && (
                    <div className="flex items-center gap-3">
                        <RoundMediaSpot type="potw" seasonId={seasonId} roundKey={round.key} post={round.potw} onChanged={onChanged} />
                        <RoundMediaSpot type="totw" seasonId={seasonId} roundKey={round.key} post={round.totw} onChanged={onChanged} />
                    </div>
                )}
            </div>
            {round.matches.map(match => (
                <DashboardMatchLine key={match.id} match={match} onChanged={onChanged} />
            ))}
        </div>
    );
}
