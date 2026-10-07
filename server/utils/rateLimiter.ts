import { logger } from "@/server/utils/logger";

type RateLimitEntry = {
    count: number;
    windowStart: number;
};

const RATE_LIMITS = {
    ADMIN_UPLOADS_PER_HOUR: 10,
    WINDOW_MS: 60 * 60 * 1000,
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000,
} as const;

const uploadLimits = new Map<string, RateLimitEntry>();

let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
    if (cleanupInterval) return;

    cleanupInterval = setInterval(() => {
        const now = Date.now();
        let cleaned = 0;

        for (const [userId, entry] of uploadLimits.entries()) {
            if (now - entry.windowStart > RATE_LIMITS.WINDOW_MS) {
                uploadLimits.delete(userId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug({ cleaned }, "Cleaned stale rate limit entries");
        }
    }, RATE_LIMITS.CLEANUP_INTERVAL_MS);
}

startCleanup();

export function checkUploadRateLimit(userId: string, role: string): {
    allowed: boolean;
    remainingUploads?: number;
    resetAt?: number;
} {
    if (role === 'super_admin') {
        return { allowed: true };
    }

    const now = Date.now();
    const entry = uploadLimits.get(userId);

    if (!entry || now - entry.windowStart > RATE_LIMITS.WINDOW_MS) {
        uploadLimits.set(userId, { count: 0, windowStart: now });
        return {
            allowed: true,
            remainingUploads: RATE_LIMITS.ADMIN_UPLOADS_PER_HOUR - 1,
            resetAt: now + RATE_LIMITS.WINDOW_MS,
        };
    }

    if (entry.count >= RATE_LIMITS.ADMIN_UPLOADS_PER_HOUR) {
        const resetAt = entry.windowStart + RATE_LIMITS.WINDOW_MS;
        logger.warn({ userId, count: entry.count, resetAt }, "Upload rate limit exceeded");
        return {
            allowed: false,
            remainingUploads: 0,
            resetAt,
        };
    }

    return {
        allowed: true,
        remainingUploads: RATE_LIMITS.ADMIN_UPLOADS_PER_HOUR - entry.count - 1,
        resetAt: entry.windowStart + RATE_LIMITS.WINDOW_MS,
    };
}

const UPDATE_LOG_IMAGES_PER_HOUR = 30;
const updateLogImageUploads = new Map<string, RateLimitEntry>();

export function takeUpdateLogImageUpload(userId: string, role: string): { allowed: boolean; resetAt?: number } {
    if (role === 'super_admin') return { allowed: true };

    const now = Date.now();
    const entry = updateLogImageUploads.get(userId);
    if (!entry || now - entry.windowStart > RATE_LIMITS.WINDOW_MS) {
        updateLogImageUploads.set(userId, { count: 1, windowStart: now });
        return { allowed: true };
    }
    if (entry.count >= UPDATE_LOG_IMAGES_PER_HOUR) {
        const resetAt = entry.windowStart + RATE_LIMITS.WINDOW_MS;
        logger.warn({ userId, count: entry.count, resetAt }, "Update log image upload limit exceeded");
        return { allowed: false, resetAt };
    }
    entry.count++;
    return { allowed: true };
}

export function incrementUploadCount(userId: string): void {
    const now = Date.now();
    const entry = uploadLimits.get(userId);

    if (!entry || now - entry.windowStart > RATE_LIMITS.WINDOW_MS) {
        uploadLimits.set(userId, { count: 1, windowStart: now });
    } else {
        entry.count++;
    }
}

export function getRateLimitStatus(userId: string): {
    count: number;
    limit: number;
    resetAt: number;
} | null {
    const entry = uploadLimits.get(userId);
    if (!entry) return null;

    return {
        count: entry.count,
        limit: RATE_LIMITS.ADMIN_UPLOADS_PER_HOUR,
        resetAt: entry.windowStart + RATE_LIMITS.WINDOW_MS,
    };
}