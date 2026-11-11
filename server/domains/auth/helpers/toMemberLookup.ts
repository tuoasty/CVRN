import {Result} from "@/shared/types/result";
import type {MemberLookup} from "./nextRoleValidity";

export function toMemberLookup(result: Result<{roles: string[]} | null>): MemberLookup {
    if (!result.ok) return {kind: "error"};
    if (!result.value) return {kind: "not_member"};
    return {kind: "member", roles: result.value.roles};
}
