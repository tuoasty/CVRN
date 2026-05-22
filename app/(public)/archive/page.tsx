import ArchivePage from "@/app/(public)/archive/ArchivePage";
import { SWRFallback } from "@/app/providers/SWRFallback";
import { getArchiveAction } from "@/app/actions/season.actions";

export default async function Page() {
    const result = await getArchiveAction();
    const archive = result.ok ? result.value : [];

    return (
        <SWRFallback fallback={{ archive }}>
            <ArchivePage />
        </SWRFallback>
    );
}
