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
            stack: error.stack
        };
    }

    return {
        message: String(error),
        name: "UnknownError"
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
        statusCode
    };
}