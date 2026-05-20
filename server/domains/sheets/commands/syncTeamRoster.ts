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
import {insertTeamNameHistory} from "@/server/db/teamNameHistory.repo";
import {
    findAllTeamPlayers,
    addPlayerToTeam,
    removePlayerFromTeam,
    bulkRemovePlayersFromTeam,
    setPlayerRole,
    upsertPlayer,
} from "@/server/db/players.repo";
import {getRobloxUserByName, getRobloxAvatarsById} from "@/server/roblox/users";
import {RobloxUser} from "@/shared/types/roblox";
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

        const disbandedNumbers = new Set(parsed.filter(p => p.disbanded).map(p => p.teamNumber));
        const activeTeams = parsed.filter(p => !p.disbanded);
        const changes: SyncChange[] = [];
        let rowsProcessed = 0;
        let rowsErrored = 0;
        const errors: {row: number; message: string}[] = [];

        for (const num of disbandedNumbers) {
            const team = existingByNumber.get(num);
            if (!team) continue;

            const playersResult = await findAllTeamPlayers(supabase, team.id, config.season_id);
            if (!playersResult.ok) {
                logger.error({teamId: team.id, error: playersResult.error}, "Failed to load players for disbanded team");
                errors.push({row: 0, message: `Failed to load players for team ${team.name}: ${playersResult.error.message}`});
                rowsErrored++;
                continue;
            }
            const playerIds = playersResult.value.filter(r => r.player).map(r => r.player!.id);
            if (playerIds.length > 0) {
                const removeResult = await bulkRemovePlayersFromTeam(supabase, config.season_id, playerIds);
                if (!removeResult.ok) {
                    logger.error({teamId: team.id, error: removeResult.error}, "Failed to remove players from disbanded team");
                    errors.push({row: 0, message: `Failed to remove players from team ${team.name}: ${removeResult.error.message}`});
                    rowsErrored++;
                    continue;
                }
            }

            const disbandResult = await softDeleteTeamById(supabase, team.id);
            if (!disbandResult.ok) {
                logger.error({teamId: team.id, error: disbandResult.error}, "Failed to disband team");
                errors.push({row: 0, message: `Failed to disband team ${team.name}: ${disbandResult.error.message}`});
                rowsErrored++;
            } else {
                changes.push({
                    type: 'team_disband',
                    entityId: team.id,
                    before: {name: team.name},
                    after: {},
                });
            }
        }

        for (const parsedTeam of activeTeams) {
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
                    type: 'team_creation',
                    entityId: team.id,
                    before: {},
                    after: {name: parsedTeam.teamName, teamNumber: parsedTeam.teamNumber},
                });
            } else {
                const prev = existingByNumber.get(parsedTeam.teamNumber)!;
                if (prev.name !== parsedTeam.teamName) {
                    const historyResult = await insertTeamNameHistory(supabase, {
                        teamId: team.id,
                        oldName: prev.name,
                        newName: parsedTeam.teamName,
                    });
                    if (!historyResult.ok) {
                        logger.error({teamId: team.id, error: historyResult.error}, "Failed to record team rename");
                    }
                    changes.push({
                        type: 'team_rename',
                        entityId: team.id,
                        before: {name: prev.name},
                        after: {
                            name: parsedTeam.teamName,
                            teamNameHistoryId: historyResult.ok ? historyResult.value.id : undefined,
                        },
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

            // Resolve Roblox IDs for all unmatched parsed players upfront
            type Resolution = {parsedPlayer: typeof parsedTeam.players[number]; robloxUser: RobloxUser; avatarUrl: string | null};
            const resolvedByRobloxId = new Map<string, Resolution>();
            const resolvedUsernameToRobloxId = new Map<string, string>();
            const failedResolutions = new Set<string>();
            const renamedUsernames = new Set<string>(); // sheet usernames (lowercase) that are outdated
            const canonicalNamesToSkip = new Set<string>(); // DB usernames (lowercase) to protect from remove

            for (const [uname, parsedPlayer] of parsedByUsername) {
                if (currentByUsername.has(uname)) continue;

                const robloxResult = await getRobloxUserByName(parsedPlayer.username);
                if (!robloxResult.ok || robloxResult.value.length === 0) {
                    logger.warn({username: parsedPlayer.username}, "Roblox user not found");
                    errors.push({row: parsedPlayer.rowNumber, message: `[${parsedTeam.teamName}] Player "${parsedPlayer.username}" not found on Roblox`});
                    rowsErrored++;
                    failedResolutions.add(uname);
                    continue;
                }
                const robloxUser = robloxResult.value[0];
                const canonicalName = robloxUser.name.toLowerCase();
                const robloxId = String(robloxUser.id);
                const avatarResult = await getRobloxAvatarsById([robloxId]);
                const avatarUrl = avatarResult.ok ? (avatarResult.value[0]?.imageUrl ?? null) : null;

                resolvedByRobloxId.set(robloxId, {parsedPlayer, robloxUser, avatarUrl});
                resolvedUsernameToRobloxId.set(uname, robloxId);

                // requestedUsername !== name means player renamed on Roblox since sheet was last updated
                if (canonicalName !== uname && currentByUsername.has(canonicalName)) {
                    errors.push({
                        row: parsedPlayer.rowNumber,
                        message: `[${parsedTeam.teamName}] Username "${parsedPlayer.username}" is outdated — Roblox username is now "${robloxUser.name}". Update the sheet.`,
                    });
                    renamedUsernames.add(uname);
                    canonicalNamesToSkip.add(canonicalName);
                }
            }

            // Remove players not on sheet (skip players whose sheet entry uses their old username)
            for (const [uname, pts] of currentByUsername) {
                if (parsedByUsername.has(uname)) continue;
                if (canonicalNamesToSkip.has(uname)) continue;

                const removeResult = await removePlayerFromTeam(supabase, {
                    playerId: pts.player_id,
                    seasonId: config.season_id,
                });
                if (!removeResult.ok) {
                    logger.error({playerId: pts.player_id, error: removeResult.error}, "Failed to remove player");
                    errors.push({row: 0, message: `[${parsedTeam.teamName}] Remove ${uname}: ${removeResult.error.message}`});
                    rowsErrored++;
                } else {
                    changes.push({
                        type: 'player_remove',
                        entityId: pts.player_id,
                        before: {username: uname, teamId: team.id, playerTeamSeasonId: removeResult.value.id},
                        after: {},
                    });
                }
            }

            // Add new players and sync roles
            for (const [uname, parsedPlayer] of parsedByUsername) {
                const existing = currentByUsername.get(uname);

                if (!existing) {
                    if (failedResolutions.has(uname) || renamedUsernames.has(uname)) continue;

                    const robloxId = resolvedUsernameToRobloxId.get(uname)!;
                    const {robloxUser, avatarUrl} = resolvedByRobloxId.get(robloxId)!;

                    const upsertResult = await upsertPlayer(supabase, {
                        robloxUserId: robloxId,
                        username: robloxUser.name,
                        displayName: robloxUser.displayName ?? null,
                        avatarUrl,
                    });
                    if (!upsertResult.ok) {
                        logger.error({username: parsedPlayer.username, error: upsertResult.error}, "Failed to upsert player");
                        errors.push({row: parsedPlayer.rowNumber, message: `[${parsedTeam.teamName}] Upsert ${parsedPlayer.username}: ${upsertResult.error.message}`});
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
                        errors.push({row: parsedPlayer.rowNumber, message: `[${parsedTeam.teamName}] Add ${parsedPlayer.username}: ${addResult.error.message}`});
                        rowsErrored++;
                        continue;
                    }

                    changes.push({
                        type: 'player_add',
                        entityId: upsertResult.value.id,
                        before: {},
                        after: {
                            username: parsedPlayer.username,
                            role: parsedPlayer.role,
                            teamId: team.id,
                            playerTeamSeasonId: addResult.value.id,
                        },
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
                        errors.push({row: parsedPlayer.rowNumber, message: `[${parsedTeam.teamName}] Role ${parsedPlayer.username}: ${roleResult.error.message}`});
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
