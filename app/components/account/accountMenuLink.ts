import type {AccessGroup} from "@/shared/types/accessGroup";
import {landingFor} from "@/shared/auth/pageAccess";

export type AccountMenuVariant = "public" | "admin";

export function accountMenuLink(variant: AccountMenuVariant, groups: readonly AccessGroup[]): {href: string; label: string} | null {
    if (variant === "admin") return {href: "/", label: "Back to site"};
    if (groups.length === 0) return null;
    return {href: landingFor(groups), label: "Admin"};
}
