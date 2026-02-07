"use client"

import { useEffect, useState } from "react";
import ErrorDisplay from "@/app/components/ui/ErrorDisplay";
import { getMatchesAction } from "@/app/actions/match.actions";

function MatchList() {
    const [matches, setMatches] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMatches() {
            try {
                const result = await getMatchesAction();

                if (!result.ok) {
                    setError("Failed to load matches. Please try again later.");
                } else {
                    setMatches(result.value);
                }
            } catch (error) {
                console.log(error)
                setError("Failed to load matches. Please try again later.");
            } finally {
                setLoading(false);
            }
        }

        fetchMatches();
    }, []);

    if (loading) {
        return <div>Loading matches...</div>;
    }

    if (error) {
        return <ErrorDisplay message={error} />;
    }

    return (
        <ul>
            {matches.map((match) => (
                <li key={match.id}>{match.name}</li>
            ))}
        </ul>
    );
}

export default MatchList;