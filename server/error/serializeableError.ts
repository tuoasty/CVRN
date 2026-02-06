export interface SerializableError {
    message: string;
    name?: string;
    stack?: string;
    code?: string;
    statusCode?: number;
}

export function serializeError(error: unknown): SerializableError {

    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            stack: error.stack,
        };
    }
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as any).message === "string"
    ) {
        return {
            message: (error as any).message,
            name: (error as any).name ?? "Error",
            code: (error as any).code,
            statusCode:
                (error as any).statusCode ??
                (error as any).status ??
                undefined,
        };
    }
    if (typeof error === "string") {
        return {
            message: error,
            name: "Error",
        };
    }
    return {
        message: "Unknown error occurred",
        name: "UnknownError",
    };
}

export function createError(
    message: string,
    code?: string,
    statusCode?: number
): SerializableError {
    return {
        message,
        name: "Error",
        code,
        statusCode,
    };
}
