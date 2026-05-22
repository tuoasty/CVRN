import TeamsPage from "@/app/(public)/teams/TeamsPage";
import { SWRFallback } from "@/app/providers/SWRFallback";
import { getAllTeamsWithRegionsAction } from "@/app/actions/team.actions";

export default async function Page() {
    const result = await getAllTeamsWithRegionsAction();
    const teams = result.ok ? result.value : [];

    return (
        <SWRFallback fallback={{ teams }}>
            <TeamsPage />
        </SWRFallback>
    );
}
