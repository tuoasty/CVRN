export type AuditScalar = string | number | boolean | null;
export type AuditValue = AuditScalar | AuditScalar[];

const MAX_KEYS = 20;
const MAX_STRING = 200;
const MAX_ARRAY = 20;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function isScalar(value: unknown): value is AuditScalar {
    if (value === null || typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "string") return value.length <= MAX_STRING;
    return false;
}

export function toAuditTarget(input: unknown): Record<string, AuditValue> | null {
    if (!isPlainObject(input)) return null;

    const target: Record<string, AuditValue> = {};
    let kept = 0;

    for (const [key, value] of Object.entries(input)) {
        if (kept >= MAX_KEYS) break;

        if (isScalar(value)) {
            target[key] = value;
            kept++;
        } else if (Array.isArray(value)) {
            if (value.length <= MAX_ARRAY && value.every(isScalar)) {
                target[key] = value;
            } else {
                target[`${key}Count`] = value.length;
            }
            kept++;
        }
    }

    return kept === 0 ? null : target;
}
