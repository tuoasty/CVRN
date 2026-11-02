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
    MEDIA_MATCH_SLOT_TAKEN: "This match already has a GFX/VOD attached. Remove it first.",
    MEDIA_ROUND_SLOT_TAKEN: "This round already has a POTW or TOTW. Edit it instead.",
    INVITE_EXPIRED: "This invite has expired. Ask an admin to send a new one.",
    UPDATE_LOG_VERSION_TAKEN: "That version already has an update log. Choose another.",
    UPDATE_LOG_IMAGE_NAME_TAKEN: "Another image in this log already uses that name.",
};

export function errorCodeToUserMessage(code: ErrorCode | string): string {
    return messages[code as ErrorCode] ?? messages.UNKNOWN;
}
