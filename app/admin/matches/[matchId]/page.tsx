import Link from "next/link";
import {notFound} from "next/navigation";
import {ChevronLeft} from "lucide-react";
import {getMatchDetailByIdAction} from "@/app/actions/match.actions";
import {Button} from "@/app/components/ui/button";
import MatchDetailContent from "@/app/features/matchStats/MatchDetailContent";

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
                <div className="pb-4">
                    <Link href="/admin/stats">
                        <Button variant="ghost" size="sm" className="rounded-sm -ml-2">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to Stats
                        </Button>
                    </Link>
                </div>
                <MatchDetailContent detail={result.value} />
            </div>
        </div>
    );
}
