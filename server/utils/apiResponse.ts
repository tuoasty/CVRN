import type { Result } from "@/shared/types/result";
import type { ErrorCode } from "@/shared/types/errorCode";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    MEDIA_PIN_LIMIT_EXCEEDED: 409,
    MEDIA_MATCH_SLOT_TAKEN: 409,
    MEDIA_ROUND_SLOT_TAKEN: 409,
    UPDATE_LOG_VERSION_TAKEN: 409,
    UPDATE_LOG_IMAGE_NAME_TAKEN: 409,
    INTEGRATION_ERROR: 502,
    DB_ERROR: 500,
    UNKNOWN: 500,
};

export function toApiResponse<T>(result: Result<T>): Response {
    if (result.ok) return Response.json(result.value);
    const status = result.error.statusCode ?? STATUS_BY_CODE[result.error.code] ?? 500;
    return Response.json({ error: result.error.message, code: result.error.code }, { status });
}
