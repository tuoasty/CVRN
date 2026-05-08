import {DBClient} from "@/shared/types/db";
import {SyncError} from "@/server/domains/sheets/types";
import {findOfficialByExactUsername, upsertOfficial} from "@/server/db/official.repo";
import {assignMultipleOfficials, removeAllOfficialsByType} from "@/server/db/matchOfficial.repo";
import {getRobloxUserByName, getRobloxAvatarsById} from "@/server/roblox/users";

async function resolveOfficialId(
    supabase: DBClient,
    username: string,
    rowNumber: number,
    matchCode: string,
    errors: SyncError[]
): Promise<string | null> {
    const existing = await findOfficialByExactUsername(supabase, username);
    if (!existing.ok) {
        errors.push({row: rowNumber, message: `[${matchCode}] Official "${username}": DB error — ${existing.error.message}`});
        return null;
    }
    if (existing.value) return existing.value.id;

    // Not in DB — look up on Roblox
    const robloxResult = await getRobloxUserByName(username);
    if (!robloxResult.ok || robloxResult.value.length === 0) {
        errors.push({row: rowNumber, message: `[${matchCode}] Official "${username}": not found on Roblox — check username spelling`});
        return null;
    }
    const robloxUser = robloxResult.value[0];

    const avatarResult = await getRobloxAvatarsById([String(robloxUser.id)]);
    const avatarUrl = avatarResult.ok ? (avatarResult.value[0]?.imageUrl ?? null) : null;

    const upsertResult = await upsertOfficial(supabase, {
        robloxUserId: String(robloxUser.id),
        username: robloxUser.name,
        displayName: robloxUser.displayName ?? null,
        avatarUrl,
    });
    if (!upsertResult.ok) {
        errors.push({row: rowNumber, message: `[${matchCode}] Official "${username}": failed to save — ${upsertResult.error.message}`});
        return null;
    }
    return upsertResult.value.id;
}

export async function resolveAndAssignMatchOfficials(
    supabase: DBClient,
    matchId: string,
    refereeUsernames: string[],
    mediaUsernames: string[],
    rowNumber: number,
    matchCode: string,
): Promise<SyncError[]> {
    const errors: SyncError[] = [];

    for (const [usernames, type] of [
        [refereeUsernames, 'referee'],
        [mediaUsernames, 'media'],
    ] as [string[], 'referee' | 'media'][]) {
        if (usernames.length === 0) continue;

        const clearResult = await removeAllOfficialsByType(supabase, matchId, type);
        if (!clearResult.ok) {
            errors.push({row: rowNumber, message: `[${matchCode}] Failed to clear ${type}s: ${clearResult.error.message}`});
            continue;
        }

        const ids: string[] = [];
        for (const username of usernames) {
            const id = await resolveOfficialId(supabase, username, rowNumber, matchCode, errors);
            if (id) ids.push(id);
        }

        if (ids.length > 0) {
            const assignResult = await assignMultipleOfficials(supabase, matchId, ids, type);
            if (!assignResult.ok) {
                errors.push({row: rowNumber, message: `[${matchCode}] Failed to assign ${type}s: ${assignResult.error.message}`});
            }
        }
    }

    return errors;
}
