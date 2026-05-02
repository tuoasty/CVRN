import "server-only";
import {logger} from "@/server/utils/logger";
import {Err, Result} from "@/shared/types/result";
import {SerializableError} from "@/server/utils/serializeableError";

const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW_MS = 60_000;
const OPEN_DURATION_MS = 30_000;

type State = "closed" | "open" | "half_open";

const failures: number[] = [];
let state: State = "closed";
let openUntil = 0;

function setState(next: State, reason: string) {
    if (state === next) return;
    logger.warn({from: state, to: next, reason}, "Roblox circuit breaker state change");
    state = next;
}

function pruneFailures(now: number) {
    const cutoff = now - FAILURE_WINDOW_MS;
    while (failures.length > 0 && failures[0] < cutoff) failures.shift();
}

function recordFailure(now: number) {
    failures.push(now);
    pruneFailures(now);
    if (failures.length >= FAILURE_THRESHOLD) {
        openUntil = now + OPEN_DURATION_MS;
        setState("open", `${failures.length} failures in ${FAILURE_WINDOW_MS}ms`);
    }
}

function recordSuccess() {
    failures.length = 0;
    if (state !== "closed") setState("closed", "success after open/half_open");
}

const BREAKER_OPEN_ERROR: SerializableError = {
    code: "INTEGRATION_ERROR",
    message: "Roblox API temporarily unavailable (circuit breaker open)"
};

export async function withBreaker<T>(fn: () => Promise<Result<T, SerializableError>>): Promise<Result<T, SerializableError>> {
    const now = Date.now();

    if (state === "open") {
        if (now < openUntil) return Err(BREAKER_OPEN_ERROR);
        setState("half_open", "open duration elapsed");
    }

    const result = await fn();

    if (result.ok) {
        recordSuccess();
        return result;
    }

    if (result.error.code === "INTEGRATION_ERROR") {
        recordFailure(Date.now());
    }
    return result;
}
