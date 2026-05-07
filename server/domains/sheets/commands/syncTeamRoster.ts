import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {SheetConfig} from "@/shared/types/db";
import {SyncChange, SyncResult} from "@/server/domains/sheets/types";
import {parseTeamsSheet} from "@/server/domains/sheets/helpers/parseTeamsSheet";
import {readSheetRangeWithColors} from "@/server/utils/googleSheets";
import {
    findTeamsBySeasonId,
    upsertTeamByNumber,
    softDeleteTeamById,
} from "@/server/db/teams.repo";
import {
    findAllTeamPlayers,
    addPlayerToTeam,
    removePlayerFromTeam,
    setPlayerRole,
    upsertPlayer,
} from "@/server/db/players.repo";
import {getRobloxUserByName} from "@/server/roblox/users";
import {generateSlug} from "@/server/domains/team/helpers/generateSlug";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function syncTeamRoster(
    supabase: DBClient,
    config: SheetConfig
): Promise<Result<SyncResult>> {
    try {
        const {values, bgColors} = await readSheetRangeWithColors(config.sheet_id, config.tab_name);

        const parsed = parseTeamsSheet(
            values,
            config.header_row ?? 9,
            config.block_height ?? 18,
            config.block_stride ?? 4,
            bgColors
        );

        const existingTeamsResult = await findTeamsBySeasonId(supabase, config.season_id);
        if (!existingTeamsResult.ok) return existingTeamsResult;

        const existingByNumber = new Map(
            existingTeamsResult.value
                .filter(t => t.team_number != null)
                .map(t => [t.team_number!, t])
        );

        const parsedNumbers = new Set(parsed.map(p => p.teamNumber));
        const changes: SyncChange[] = [];
        let rowsProcessed = 0;
        let rowsErrored = 0;
        const errors: {row: number; message: string}[] = [];

        // Disband teams that no longer appear on the sheet
        for (const [num, team] of existingByNumber) {
            if (!parsedNumbers.has(num)) {
                const disbandResult = await softDeleteTeamById(supabase, team.id);
                if (!disbandResult.ok) {
                    logger.error({teamId: team.id, error: disbandResult.error}, "Failed to disband team");
                    errors.push({row: 0, message: `Failed to disband team ${team.name}: ${disbandResult.error.message}`});
                    rowsErrored++;
                } else {
                    changes.push({
                        type: 'team_rename',
                        entityId: team.id,
                        before: {name: team.name, disbanded: false},
                        after: {name: team.name, disbanded: true},
                    });
                }
            }
        }

        // Upsert each parsed team and sync players
        for (const parsedTeam of parsed) {
            rowsProcessed++;
            const slug = generateSlug(parsedTeam.teamName);
            const teamResult = await upsertTeamByNumber(supabase, {
                seasonId: config.season_id,
                teamNumber: parsedTeam.teamNumber,
                name: parsedTeam.teamName,
                slug,
                brickColor: parsedTeam.teamColor ?? undefined,
                brickNumber: parsedTeam.brickNumber ?? undefined,
            });

            if (!teamResult.ok) {
                logger.error({teamNumber: parsedTeam.teamNumber, error: teamResult.error}, "Failed to upsert team");
                errors.push({row: 0, message: `Team ${parsedTeam.teamName}: ${teamResult.error.message}`});
                rowsErrored++;
                continue;
            }

            const team = teamResult.value;
            const wasExisting = existingByNumber.has(parsedTeam.teamNumber);

            if (!wasExisting) {
                changes.push({
                    type: 'team_rename',
                    entityId: team.id,
                    before: {},
                    after: {name: parsedTeam.teamName, teamNumber: parsedTeam.teamNumber},
                });
            } else {
                const prev = existingByNumber.get(parsedTeam.teamNumber)!;
                if (prev.name !== parsedTeam.teamName) {
                    changes.push({
                        type: 'team_rename',
                        entityId: team.id,
                        before: {name: prev.name},
                        after: {name: parsedTeam.teamName},
                    });
                }
            }

            // Sync players
            const currentPlayersResult = await findAllTeamPlayers(supabase, team.id, config.season_id);
            if (!currentPlayersResult.ok) {
                logger.error({teamId: team.id, error: currentPlayersResult.error}, "Failed to load current players");
                errors.push({row: 0, message: `Team ${parsedTeam.teamName}: failed to load players`});
                rowsErrored++;
                continue;
            }

            const currentPlayers = currentPlayersResult.value;
            const currentByUsername = new Map(
                currentPlayers
                    .filter(pts => pts.player?.username)
                    .map(pts => [pts.player!.username!.toLowerCase(), pts])
            );

            const parsedByUsername = new Map(
                parsedTeam.players.map(p => [p.username.toLowerCase(), p])
            );

            // Remove players not on sheet
            for (const [uname, pts] of currentByUsername) {
                if (!parsedByUsername.has(uname)) {
                    const removeResult = await removePlayerFromTeam(supabase, {
                        playerId: pts.player_id,
                        seasonId: config.season_id,
                    });
                    if (!removeResult.ok) {
                        logger.error({playerId: pts.player_id, error: removeResult.error}, "Failed to remove player");
                        errors.push({row: 0, message: `Remove ${uname}: ${removeResult.error.message}`});
                        rowsErrored++;
                    } else {
                        changes.push({
                            type: 'player_remove',
                            entityId: pts.player_id,
                            before: {username: uname, teamId: team.id},
                            after: {},
                        });
                    }
                }
            }

            // Add new players and sync roles
            for (const [uname, parsedPlayer] of parsedByUsername) {
                const existing = currentByUsername.get(uname);

                if (!existing) {
                    // Resolve via Roblox API
                    const robloxResult = await getRobloxUserByName(parsedPlayer.username);
                    if (!robloxResult.ok || robloxResult.value.length === 0) {
                        logger.warn({username: parsedPlayer.username}, "Roblox user not found");
                        errors.push({
                            row: parsedPlayer.rowNumber,
                            message: `Player "${parsedPlayer.username}" not found on Roblox`,
                        });
                        rowsErrored++;
                        continue;
                    }

                    const robloxUser = robloxResult.value[0];
                    const upsertResult = await upsertPlayer(supabase, {
                        robloxUserId: String(robloxUser.id),
                        username: robloxUser.name,
                        displayName: robloxUser.displayName ?? null,
                    });
                    if (!upsertResult.ok) {
                        logger.error({username: parsedPlayer.username, error: upsertResult.error}, "Failed to upsert player");
                        errors.push({row: parsedPlayer.rowNumber, message: `Upsert ${parsedPlayer.username}: ${upsertResult.error.message}`});
                        rowsErrored++;
                        continue;
                    }

                    const addResult = await addPlayerToTeam(supabase, {
                        playerId: upsertResult.value.id,
                        teamId: team.id,
                        seasonId: config.season_id,
                        role: parsedPlayer.role,
                    });
                    if (!addResult.ok) {
                        logger.error({playerId: upsertResult.value.id, teamId: team.id, error: addResult.error}, "Failed to add player to team");
                        errors.push({row: parsedPlayer.rowNumber, message: `Add ${parsedPlayer.username}: ${addResult.error.message}`});
                        rowsErrored++;
                        continue;
                    }

                    changes.push({
                        type: 'player_add',
                        entityId: upsertResult.value.id,
                        before: {},
                        after: {username: parsedPlayer.username, role: parsedPlayer.role, teamId: team.id},
                    });
                } else if (existing.role !== parsedPlayer.role) {
                    // Role changed
                    const roleResult = await setPlayerRole(supabase, {
                        playerId: existing.player_id,
                        teamId: team.id,
                        seasonId: config.season_id,
                        role: parsedPlayer.role,
                    });
                    if (!roleResult.ok) {
                        logger.error({playerId: existing.player_id, error: roleResult.error}, "Failed to update role");
                        errors.push({row: parsedPlayer.rowNumber, message: `Role ${parsedPlayer.username}: ${roleResult.error.message}`});
                        rowsErrored++;
                    } else {
                        changes.push({
                            type: 'role_change',
                            entityId: existing.player_id,
                            before: {role: existing.role, teamId: team.id},
                            after: {role: parsedPlayer.role, teamId: team.id},
                        });
                    }
                }
            }
        }

        return Ok({
            rowsProcessed,
            rowsErrored,
            errors,
            changes,
        });
    } catch (error) {
        logger.error({error, configId: config.id}, "Unexpected error in syncTeamRoster");
        return Err(serializeError(error));
    }
}
