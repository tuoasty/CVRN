import Link from "next/link";
import {notFound} from "next/navigation";
import {ChevronLeft} from "lucide-react";
import {getMatchDetailByIdAction} from "@/app/actions/match.actions";
import {Button} from "@/app/components/ui/button";
import MatchDetailContent from "@/app/features/matchStats/MatchDetailContent";
import MatchMediaDialog from "@/app/features/media/MatchMediaDialog";
import {buildMatchMediaTitle} from "@/app/utils/matchLabel";

type PageProps = {
    params: Promise<{ matchId: string }>;
};

export default async function AdminMatchDetailPage({params}: PageProps) {
    const {matchId} = await params;
    const result = await getMatchDetailByIdAction(matchId);

    if (!result.ok) {
        if (result.error.code === "NOT_FOUND") notFound();
        return (
            <div className="admin-container">
                <div className="panel p-6 mt-6">
                    <p className="text-destructive">Failed to load match: {result.error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center justify-between pb-4">
                    <Link href="/admin/stats">
                        <Button variant="ghost" size="sm" className="rounded-sm -ml-2">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to Stats
                        </Button>
                    </Link>
                    <MatchMediaDialog
                        matchId={matchId}
                        mediaPosts={result.value.mediaPosts}
                        defaultTitle={buildMatchMediaTitle({
                            homeTeamName: result.value.homeTeam?.name,
                            awayTeamName: result.value.awayTeam?.name,
                            matchType: result.value.match.match_type,
                            week: result.value.match.week,
                            matchCode: result.value.match.match_code,
                            playoffRound: result.value.playoffRound,
                        })}
                    />
                </div>
                <MatchDetailContent detail={result.value} />
            </div>
        </div>
    );
}
