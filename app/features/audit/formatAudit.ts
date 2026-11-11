import type {AuditValue} from "@/shared/auth/auditTarget";
import type {AuditKind, AuditOutcome} from "@/server/domains/audit/types";

type Target = Record<string, AuditValue> | null;

const REFUSAL_REASONS: Record<string, string> = {
    no_role: "no staff role",
    discord_unavailable: "Discord unreachable",
    failed: "failed",
};

export function humanizeAction(action: string): string {
    const words = action.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

export function auditActionLabel(entry: {kind: AuditKind; action: string; outcome: AuditOutcome; target: Target}): string {
    if (entry.kind === "auth") {
        if (entry.action === "signOut") return "Signed out";
        if (entry.outcome === "allowed") return "Signed in";
        const reason = typeof entry.target?.reason === "string" ? entry.target.reason : null;
        return reason ? `Sign-in refused (${REFUSAL_REASONS[reason] ?? reason})` : "Sign-in refused";
    }
    return humanizeAction(entry.action);
}

function formatValue(value: AuditValue): string {
    if (Array.isArray(value)) return value.map(v => String(v)).join("/");
    return String(value);
}

export function formatAuditTarget(target: Target, kind: AuditKind = "action"): string {
    if (!target) return "";
    return Object.entries(target)
        .filter(([key]) => !(kind === "auth" && key === "reason"))
        .map(([key, value]) => `${key}: ${formatValue(value)}`)
        .join(", ");
}
