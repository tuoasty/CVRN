import {getRobloxAvatarsById, getRobloxUserByName} from "@/server/roblox/users";
import {Err, Ok, Result} from "@/shared/types/result";
import {RobloxUserWithAvatar} from "@/shared/types/roblox";
import {DBClient, Official} from "@/shared/types/db";
import {OfficialWithInfo, SaveOfficialInput, SearchOfficialsInput} from "@/server/dto/official.dto";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {
    deleteOfficial,
    findAllOfficials, findOfficialByExactUsername,
    findOfficialByRobloxId, findOfficialsBySimilarity,
    updateOfficial,
    upsertOfficial
} from "@/server/db/official.repo";
import {RobloxUserIdInput} from "@/server/dto/player.dto";

const SYNC_INTERVAL = 1000 * 60 * 60;

export async function getOfficialsByName(
    supabase: DBClient,
    username: string
): Promise<Result<RobloxUserWithAvatar[]>> {
    const result = await getRobloxUserByName(username);

    if (!result.ok) {
        logger.error({username, error: result.error}, "Failed to fetch Roblox user by name");
        return Err(result.error);
    }

    const users = result.value;

    if (users.length === 0) {
        return Ok([]);
    }

    const userIds = users.map(user => user.id);
    const avatarsResult = await getRobloxAvatarsById(userIds);

    if (!avatarsResult.ok) {
        logger.error({userIds, error: avatarsResult.error}, "Failed to fetch Roblox avatars");
        return Err(avatarsResult.error);
    }

    const usersWithAvatars: RobloxUserWithAvatar[] = users.map(user => {
        const avatar = avatarsResult.value.find(av => av.targetId === user.id);

        return {
            ...user,
            id: String(user.id),
            avatarUrl: avatar?.imageUrl || ""
        };
    });

    return Ok(usersWithAvatars);
}

export async function saveOfficial(
    supabase: DBClient,
    p: SaveOfficialInput
): Promise<Result<Official>> {
    try {
        const {data: existingOfficial} = await findOfficialByRobloxId(supabase, p.robloxUserId);

        if (existingOfficial) {
            logger.info({robloxUserId: p.robloxUserId}, "Official already exists, syncing latest data");

            const syncResult = await lazySyncOfficial(supabase, existingOfficial);

            if (syncResult.ok) {
                return Ok(syncResult.value);
            }

            return Ok(existingOfficial);
        }

        const {data, error} = await upsertOfficial(supabase, p);

        if (error) {
            logger.error({robloxUserId: p.robloxUserId, error}, "Failed to upsert official");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "UpsertError",
                message: "Failed to save official"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error saving official");
        return Err(serializeError(error));
    }
}

export async function getAllOfficials(
    supabase: DBClient
): Promise<Result<Official[]>> {
    try {
        const {data, error} = await findAllOfficials(supabase);

        if (error) {
            logger.error({error}, "Failed to fetch all officials");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch officials",
                name: "FetchError"
            });
        }

        const syncedOfficials: Official[] = [];

        for (const official of data) {
            const result = await lazySyncOfficial(supabase, official);

            if (result.ok) {
                syncedOfficials.push(result.value);
            } else {
                syncedOfficials.push(official);
            }
        }

        return Ok(syncedOfficials);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching officials");
        return Err(serializeError(error));
    }
}

export async function removeOfficial(
    supabase: DBClient,
    p: RobloxUserIdInput
): Promise<Result<boolean>> {
    try {
        const {data: existingOfficial} = await findOfficialByRobloxId(supabase, p.robloxUserId);

        if (!existingOfficial) {
            logger.error({robloxUserId: p.robloxUserId}, "Official not found");
            return Err({
                name: "OfficialNotFound",
                message: "Official does not exist"
            });
        }

        const {error} = await deleteOfficial(supabase, existingOfficial.id);

        if (error) {
            logger.error({robloxUserId: p.robloxUserId, error}, "Failed to delete official");
            return Err(serializeError(error));
        }

        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error removing official");
        return Err(serializeError(error));
    }
}

export async function searchOfficialsInDatabase(
    supabase: DBClient,
    p: SearchOfficialsInput
): Promise<Result<OfficialWithInfo[]>> {
    try {
        const { data, error } = await findOfficialsBySimilarity(supabase, p.query);

        if (error) {
            logger.error({ query: p.query, error }, "Failed to search officials in database");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to search officials",
                name: "SearchError"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({ error }, "Unexpected error searching officials in database");
        return Err(serializeError(error));
    }
}

export async function getOfficialByExactUsername(
    supabase: DBClient,
    p: SearchOfficialsInput
): Promise<Result<OfficialWithInfo | null>> {
    try {
        const { data: official, error } = await findOfficialByExactUsername(supabase, p.query);

        if (error) {
            logger.error({ query: p.query, error }, "Failed to find official by exact username");
            return Err(serializeError(error));
        }

        if (!official || !official.username) {
            return Ok(null);
        }

        const result: OfficialWithInfo = {
            id: official.id,
            roblox_user_id: official.roblox_user_id,
            username: official.username,
            display_name: official.display_name,
            avatar_url: official.avatar_url
        };

        return Ok(result);
    } catch (error) {
        logger.error({ error }, "Unexpected error finding official by exact username");
        return Err(serializeError(error));
    }
}

export async function lazySyncOfficial(
    supabase: DBClient,
    official: Official
): Promise<Result<Official>> {
    try {
        if (!needsSync(official.last_synced_at ?? null)) {
            return Ok(official);
        }

        if (!official.username) {
            return Ok(official);
        }

        const userResult = await getRobloxUserByName(official.username);

        if (!userResult.ok || userResult.value.length === 0) {
            logger.error({
                username: official.username,
                error: userResult.ok ? null : userResult.error
            }, "Failed to fetch Roblox user during lazy sync");
            return Ok(official);
        }

        const user = userResult.value[0];

        if (!user?.id) {
            return Ok(official);
        }

        const avatarResult = await getRobloxAvatarsById([user.id]);
        let avatarUrl: string | null = official.avatar_url;

        if (avatarResult.ok) {
            const avatar = avatarResult.value.find(a => a.targetId === user.id);

            if (avatar?.imageUrl) {
                avatarUrl = avatar.imageUrl;
            }
        } else {
            logger.error({userId: user.id, error: avatarResult.error}, "Failed to fetch avatar during lazy sync");
        }

        const {data, error} = await updateOfficial(supabase, {
            robloxUserId: String(user.id),
            username: user.name,
            displayName: user.displayName ?? null,
            avatarUrl,
            lastSyncedAt: new Date().toISOString(),
        });

        if (error) {
            logger.error({robloxUserId: String(user.id), error}, "Failed to update official during lazy sync");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "UpdateError",
                message: "Failed to update official"
            });
        }

        return Ok(data);

    } catch (err) {
        logger.error({error: err}, "Unexpected error during lazy sync");
        return Err(serializeError(err));
    }
}

function needsSync(lastSynced: string | null) {
    if (!lastSynced) return true;

    const last = new Date(lastSynced).getTime();
    const now = Date.now();

    return now - last > SYNC_INTERVAL;
}