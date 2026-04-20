import type {ErrorCode} from "@/shared/types/errorCode";

export interface SerializableError {
    message: string;
    code: ErrorCode;
    name?: string;
    stack?: string;
    statusCode?: number;
}

export function serializeError(error: unknown, code: ErrorCode = "UNKNOWN"): SerializableError {

    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            stack: error.stack,
            code,
        };
    }
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
    ) {
        const e = error as {
            message: string;
            name?: string;
            code?: string;
            statusCode?: number;
            status?: number;
        };
        return {
            message: e.message,
            name: e.name ?? "Error",
            code,
            statusCode: e.statusCode ?? e.status ?? undefined,
        };
    }
    if (typeof error === "string") {
        return {
            message: error,
            name: "Error",
            code,
        };
    }
    return {
        message: "Unknown error occurred",
        name: "UnknownError",
        code,
    };
}

export function createError(
    message: string,
    code: ErrorCode,
    statusCode?: number
): SerializableError {
    return {
        message,
        name: "Error",
        code,
        statusCode,
    };
}
