import { useEffect, useRef } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import {
    getCardBulkStatusAction,
    getCardPlayerIdsAction,
    startCardBulkJobAction,
    stopCardBulkJobAction,
} from "@/app/actions/playerCard.actions";
import { cardPlayerIdsKey } from "@/app/hooks/usePlayerCard";
import type { CardBulkJob, StartCardBulkInput } from "@/server/domains/playerCard";
import { Err, type Result } from "@/shared/types/result";

const RUNNING_POLL_MS = 2000;
const IDLE_POLL_MS = 30000;
const STATUS_DEDUPE_MS = 1000;

export const cardBulkStatusKey = ["cardBulkStatus"] as const;

async function fetchCardBulkStatus(): Promise<CardBulkJob | null> {
    const result = await getCardBulkStatusAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchCardPlayerIds([, seasonNumber, groupId]: ReturnType<typeof cardPlayerIdsKey>): Promise<string[]> {
    const result = await getCardPlayerIdsAction({ seasonNumber, groupId });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

let refreshedJobId: string | null = null;

function refreshCardsAfterRun(jobId: string) {
    if (refreshedJobId === jobId) return;
    refreshedJobId = jobId;
    void globalMutate((key: unknown) => Array.isArray(key) && (key[0] === "playerCards" || key[0] === "cardPlayerIds"));
}

export function useCardBulkStatus() {
    const { data, error } = useSWR(cardBulkStatusKey, fetchCardBulkStatus, {
        refreshInterval: job => (job?.status === "running" ? RUNNING_POLL_MS : IDLE_POLL_MS),
        dedupingInterval: STATUS_DEDUPE_MS,
        revalidateOnFocus: false,
    });

    const job = data ?? null;
    const isRunning = job?.status === "running";

    const runningJobId = useRef<string | null>(null);
    useEffect(() => {
        if (isRunning && job) {
            runningJobId.current = job.id;
            return;
        }
        if (runningJobId.current) {
            refreshCardsAfterRun(runningJobId.current);
            runningJobId.current = null;
        }
    }, [isRunning, job]);

    return {
        job,
        isRunning,
        error: error instanceof Error ? error.message : null,
    };
}

export function useCardPlayerIds(seasonNumber: number | null, groupId: string | null) {
    const { data, isLoading } = useSWR(
        seasonNumber && groupId ? cardPlayerIdsKey(seasonNumber, groupId) : null,
        fetchCardPlayerIds,
        { revalidateOnFocus: false }
    );
    return { playerIds: data ?? [], isLoading };
}

export async function startCardBulk(input: StartCardBulkInput): Promise<Result<CardBulkJob>> {
    try {
        const result = await startCardBulkJobAction(input);
        if (result.ok) await globalMutate(cardBulkStatusKey, result.value);
        return result;
    } catch {
        return Err({ message: "The connection dropped. Check the status above before trying again.", code: "INTEGRATION_ERROR" });
    }
}

export async function stopCardBulk(jobId: string): Promise<Result<null>> {
    try {
        const result = await stopCardBulkJobAction({ jobId });
        if (result.ok) await globalMutate(cardBulkStatusKey);
        return result;
    } catch {
        return Err({ message: "The connection dropped. Try again.", code: "INTEGRATION_ERROR" });
    }
}
