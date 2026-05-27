import { Suspense } from "react";
import MatchesPage from "@/app/(public)/matches/MatchesPage";

export default function Page() {
    return (
        <Suspense fallback={null}>
            <MatchesPage />
        </Suspense>
    );
}
