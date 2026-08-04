import {InvitableRole} from "@/server/domains/admin/types";

const ROLE_LABELS: Record<InvitableRole, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    stat_tracker: "Stat Tracker",
    staff: "Staff",
    spec_manager: "Spec Manager",
};

export function roleLabel(role: InvitableRole): string {
    return ROLE_LABELS[role];
}

export interface InviteEmailMetadata {
    role_label: string;
    expires_on: string;
}

export function buildInviteEmailMetadata(
    role: InvitableRole,
    expiresAt: string | null
): InviteEmailMetadata {
    return {
        role_label: roleLabel(role),
        expires_on: expiresAt ? formatExpiry(expiresAt) : "",
    };
}

function formatExpiry(expiresAt: string): string {
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    });
}
