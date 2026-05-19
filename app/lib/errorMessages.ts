import type {ErrorCode} from "@/shared/types/errorCode";

const messages: Record<ErrorCode, string> = {
    VALIDATION_ERROR: "Invalid input. Please check your data and try again.",
    NOT_FOUND: "The requested resource was not found.",
    CONFLICT: "This action conflicts with current state.",
    UNAUTHORIZED: "You must be logged in.",
    FORBIDDEN: "You don't have permission for this action.",
    DB_ERROR: "A database error occurred. Please try again.",
    INTEGRATION_ERROR: "An external service error occurred. Please try again.",
    UNKNOWN: "Something went wrong. Please try again.",
    MEDIA_PIN_LIMIT_EXCEEDED: "Only 3 posts can be pinned at a time. Unpin one first.",
};

export function errorCodeToUserMessage(code: ErrorCode | string): string {
    return messages[code as ErrorCode] ?? messages.UNKNOWN;
}
