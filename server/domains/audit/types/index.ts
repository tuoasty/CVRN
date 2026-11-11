import type {AccessGroup} from "@/shared/types/accessGroup";
import type {AuditValue} from "@/shared/auth/auditTarget";

export type AuditKind = "action" | "auth";
export type AuditOutcome = "allowed" | "denied";

export type AuditEntry = {
    id: number;
    createdAt: string;
    kind: AuditKind;
    userId: string | null;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    groups: AccessGroup[];
    action: string;
    outcome: AuditOutcome;
    target: Record<string, AuditValue> | null;
};

export type AuditPerson = {
    userId: string;
    displayName: string | null;
    username: string | null;
};

export type AuditPage = {
    entries: AuditEntry[];
    nextCursor: number | null;
    people: AuditPerson[];
};

export {GetAuditLogSchema} from "./schemas";
export type {GetAuditLogInput} from "./schemas";
