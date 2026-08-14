import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Team} from "@/shared/types/db";
import {SheetConfig} from "@/shared/types/db";
import {SyncChange, SyncResult, ParsedRosterEntry, ParsedTeamResult} from "@/server/domains/sheets/types";
import {parseTeamsSheet} from "@/server/domains/sheets/helpers/parseTeamsSheet";
import {readSheetRangeWithColors} from "@/server/utils/googleSheets";
import {
    findTeamsBySeasonId,
    upsertTeamByNumber,
    softDeleteTeamById,
} from "@/server/db/teams.repo";
import {findSeasonById} from "@/server/db/seasons.repo";
import {insertTeamNameHistory} from "@/server/db/teamNameHistory.repo";
import {
    findAllTeamPlayers,
    addPlayerToTeam,
    removePlayerFromTeam,
    bulkRemovePlayersFromTeam,
    setPlayerRole,
    setPlayerPosition,
    upsertPlayer,
    findPlayerByRole,
} from "@/server/db/players.repo";
import {getRobloxUserByName, getRobloxAvatarsById} from "@/server/roblox/users";
import {RobloxUser} from "@/shared/types/roblox";
import {generateSlug} from "@/server/domains/team/helpers/generateSlug";
import {classifyTeamNameChange} from "@/server/domains/sheets/helpers/classifyTeamNameChange";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

function friendlyPlayerError(errMsg: string, username: string, teamName: string, action: 'add' | 'role', otherTeam?: string): string {
    if (errMsg.includes('idx_one_captain_per_team_season'))
        return `[${teamName}] ${username} cannot be captain — ${teamName} already has a captain`;
    if (errMsg.includes('idx_one_vice_captain_per_team_season'))
        return `[${teamName}] ${username} cannot be vice captain — ${teamName} already has a vice captain`;
    if (errMsg.includes('idx_one_court_captain_per_team_season'))
        return `[${teamName}] ${username} cannot be court captain — ${teamName} already has a court captain`;
    if (errMsg.includes('idx_unique_active_player_season') || errMsg.includes('duplicate key'))
        return otherTeam
            ? `[${teamName}] Cannot add ${username} — already listed on ${otherTeam}`
            : `[${teamName}] Cannot add ${username} — already on another team this season`;
    return action === 'add'
        ? `[${teamName}] Failed to add ${username}`
        : `[${teamName}] Failed to update role for ${username}`;
}

type Resolution = {parsedPlayer: ParsedRosterEntry; robloxUser: RobloxUser; avatarUrl: string | null};

type TeamPhaseState = {
    parsedTeam: ParsedTeamResult;
    team: Team;
    parsedByUsername: Map<string, ParsedRosterEntry>;
    existingUsernameKeys: Set<string>;
    resolvedByRobloxId: Map<string, Resolution>;
    resolvedUsernameToRobloxId: Map<string, string>;
    failedResolutions: Set<string>;
    renamedUsernames: Set<string>;
};

export async function syncTeamRoster(
    supabase: DBClient,
    config: SheetConfig
): Promise<Result<SyncResult>> {
    try {
        const {values, bgColors} = await readSheetRangeWithColors(config.sheet_id, config.tab_name);

        const seasonResult = await findSeasonById(supabase, config.season_id);
        const maxPlayers = (seasonResult.ok ? seasonResult.value?.max_players : null) ?? 18;

        const parsed = parseTeamsSheet(
            values,
            config.header_row ?? 9,
            config.block_height ?? 18,
            config.block_stride ?? 4,
            bgColors,
            maxPlayers
        );

        const existingTeamsResult = await findTeamsBySeasonId(supabase, config.season_id);
        if (!existingTeamsResult.ok) return existingTeamsResult;

        const existingByNumber = new Map(
            existingTeamsResult.value
                .filter(t => t.team_number != null)
                .map(t => [t.team_number!, t])
        );

        const disbandedNumbers = new Set(parsed.filter(p => p.disbanded).map(p => p.teamNumber));
        const nameClearedSlots = parsed.filter(p => p.nameCleared);
        const activeTeams = parsed.filter(p => !p.disbanded && !p.nameCleared);
        const changes: SyncChange[] = [];
        let rowsProcessed = 0;
        let rowsErrored = 0;
        const errors: {row: number; message: string}[] = [];

        const accountedNumbers = new Set([
            ...disbandedNumbers,
            ...nameClearedSlots.map(s => s.teamNumber),
            ...activeTeams.map(t => t.teamNumber),
        ]);

        const allDisbandNumbers = [
            ...disbandedNumbers,
            ...[...existingByNumber.keys()].filter(n => !accountedNumbers.has(n)),
        ];

        for (const num of allDisbandNumbers) {
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

        for (const slot of nameClearedSlots) {
            const team = existingByNumber.get(slot.teamNumber);
            if (!team) continue;
            errors.push({
                row: 0,
                message: `Team "${team.name}" (slot ${slot.teamNumber}) has an empty name but still has players listed — restore the name or clear the roster first.`,
            });
            rowsErrored++;
        }

        const UNIQUE_ROLES = new Set(['captain', 'vice_captain', 'court_captain']);
        const phaseStates: TeamPhaseState[] = [];

        for (const parsedTeam of activeTeams) {
            rowsProcessed++;

            const prevForNumber = existingByNumber.get(parsedTeam.teamNumber);
            if (prevForNumber && prevForNumber.name !== parsedTeam.teamName) {
                const oldRosterResult = await findAllTeamPlayers(supabase, prevForNumber.id, config.season_id);
                if (oldRosterResult.ok) {
                    const oldUsernames = oldRosterResult.value
                        .filter(r => r.player?.username)
                        .map(r => r.player!.username!.toLowerCase());
                    const newUsernames = parsedTeam.players.map(p => p.username.toLowerCase());
                    const newCaptain = parsedTeam.players.find(p => p.role === 'captain')?.username.toLowerCase() ?? null;

                    if (classifyTeamNameChange({usernames: oldUsernames}, {usernames: newUsernames, captain: newCaptain}) === 'disband') {

                        for (const r of oldRosterResult.value) {
                            if (!r.player) continue;
                            const removeResult = await removePlayerFromTeam(supabase, {
                                playerId: r.player.id,
                                seasonId: config.season_id,
                            });
                            if (removeResult.ok) {
                                changes.push({
                                    type: 'player_remove',
                                    entityId: r.player.id,
                                    before: {username: r.player.username?.toLowerCase(), teamId: prevForNumber.id, playerTeamSeasonId: removeResult.value.id},
                                    after: {},
                                });
                            } else {
                                logger.error({playerId: r.player.id, error: removeResult.error}, "Failed to remove player during disband");
                                errors.push({row: 0, message: `[${prevForNumber.name}] Remove during disband: ${removeResult.error.message}`});
                                rowsErrored++;
                            }
                        }

                        const disbandResult = await softDeleteTeamById(supabase, prevForNumber.id);
                        if (disbandResult.ok) {
                            changes.push({
                                type: 'team_disband',
                                entityId: prevForNumber.id,
                                before: {name: prevForNumber.name},
                                after: {},
                            });
                            existingByNumber.delete(parsedTeam.teamNumber);
                        } else {
                            logger.error({teamId: prevForNumber.id, error: disbandResult.error}, "Failed to disband replaced team");
                            errors.push({row: 0, message: `Failed to disband ${prevForNumber.name}: ${disbandResult.error.message}`});
                            rowsErrored++;
                        }
                    }
                }
            }

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

            const resolvedByRobloxId = new Map<string, Resolution>();
            const resolvedUsernameToRobloxId = new Map<string, string>();
            const failedResolutions = new Set<string>();
            const renamedUsernames = new Set<string>();
            const canonicalNamesToSkip = new Set<string>();

            for (const [uname, parsedPlayer] of parsedByUsername) {
                logger.debug({uname:uname, team:team.name, }, "Player and team result")
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

                if (canonicalName !== uname && currentByUsername.has(canonicalName)) {
                    errors.push({
                        row: parsedPlayer.rowNumber,
                        message: `[${parsedTeam.teamName}] "${parsedPlayer.username}" now resolves to "${robloxUser.name}" on Roblox — the username may be outdated or claimed by a different player. Verify and update the sheet.`,
                    });
                    renamedUsernames.add(uname);
                    canonicalNamesToSkip.add(canonicalName);
                }
            }

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

            const roleChanges = [...parsedByUsername.entries()]
                .filter(([uname, parsedPlayer]) => {
                    const existing = currentByUsername.get(uname);
                    return existing && existing.role !== parsedPlayer.role;
                })
                .sort(([unameA], [unameB]) => {
                    const roleA = currentByUsername.get(unameA)!.role ?? '';
                    const roleB = currentByUsername.get(unameB)!.role ?? '';

                    if (UNIQUE_ROLES.has(roleA) && !UNIQUE_ROLES.has(roleB)) return -1;
                    if (!UNIQUE_ROLES.has(roleA) && UNIQUE_ROLES.has(roleB)) return 1;
                    return 0;
                });

            const playerIdToUsername = new Map(
                Array.from(currentByUsername.entries()).map(([uname, pts]) => [pts.player_id, uname])
            );

            for (const [uname, parsedPlayer] of roleChanges) {
                const existing = currentByUsername.get(uname)!;

                if (UNIQUE_ROLES.has(parsedPlayer.role)) {
                    const holderResult = await findPlayerByRole(supabase, team.id, config.season_id, parsedPlayer.role);
                    if (holderResult.ok && holderResult.value && holderResult.value.player_id !== existing.player_id) {
                        const holderUname = playerIdToUsername.get(holderResult.value.player_id);
                        const holderSheetRole = holderUname ? parsedByUsername.get(holderUname)?.role : undefined;

                        if (!holderSheetRole || holderSheetRole !== parsedPlayer.role) {
                            await setPlayerRole(supabase, {
                                playerId: holderResult.value.player_id,
                                teamId: team.id,
                                seasonId: config.season_id,
                                role: 'player',
                            });
                        }
                    }
                }

                const roleResult = await setPlayerRole(supabase, {
                    playerId: existing.player_id,
                    teamId: team.id,
                    seasonId: config.season_id,
                    role: parsedPlayer.role,
                });
                if (!roleResult.ok) {
                    logger.error({playerId: existing.player_id, error: roleResult.error}, "Failed to update role");
                    errors.push({row: parsedPlayer.rowNumber, message: friendlyPlayerError(roleResult.error.message, parsedPlayer.username, parsedTeam.teamName, 'role')});
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

            for (const [uname, parsedPlayer] of parsedByUsername) {
                const existing = currentByUsername.get(uname);
                if (!existing) continue;

                if (parsedPlayer.positionInvalid) {
                    errors.push({row: parsedPlayer.rowNumber, message: `[${parsedTeam.teamName}] ${parsedPlayer.username} has an unrecognized position — must be OH, OPP, MB, SET, or LIB`});
                    rowsErrored++;
                    continue;
                }

                if ((existing.position ?? null) === parsedPlayer.position) continue;

                const posResult = await setPlayerPosition(supabase, {
                    playerId: existing.player_id,
                    teamId: team.id,
                    seasonId: config.season_id,
                    position: parsedPlayer.position,
                });
                if (!posResult.ok) {
                    logger.error({playerId: existing.player_id, error: posResult.error}, "Failed to update position");
                    errors.push({row: parsedPlayer.rowNumber, message: `[${parsedTeam.teamName}] Failed to update position for ${parsedPlayer.username}`});
                    rowsErrored++;
                } else {
                    changes.push({
                        type: 'position_change',
                        entityId: existing.player_id,
                        before: {position: existing.position ?? null, teamId: team.id},
                        after: {position: parsedPlayer.position, teamId: team.id},
                    });
                }
            }

            phaseStates.push({
                parsedTeam,
                team,
                parsedByUsername,
                existingUsernameKeys: new Set(currentByUsername.keys()),
                resolvedByRobloxId,
                resolvedUsernameToRobloxId,
                failedResolutions,
                renamedUsernames,
            });
        }

        const sheetUsernameToTeams = new Map<string, string[]>();
        for (const {parsedTeam} of phaseStates) {
            for (const p of parsedTeam.players) {
                const key = p.username.toLowerCase();
                const existing = sheetUsernameToTeams.get(key);
                if (existing) existing.push(parsedTeam.teamName);
                else sheetUsernameToTeams.set(key, [parsedTeam.teamName]);
            }
        }

        for (const state of phaseStates) {
            const {parsedTeam, team, parsedByUsername, existingUsernameKeys, resolvedByRobloxId, resolvedUsernameToRobloxId, failedResolutions, renamedUsernames} = state;

            for (const [uname, parsedPlayer] of parsedByUsername) {
                if (existingUsernameKeys.has(uname)) continue;
                if (failedResolutions.has(uname) || renamedUsernames.has(uname)) continue;

                const robloxId = resolvedUsernameToRobloxId.get(uname);
                if (!robloxId) continue;
                const {robloxUser, avatarUrl} = resolvedByRobloxId.get(robloxId)!;

                const upsertResult = await upsertPlayer(supabase, {
                    robloxUserId: robloxId,
                    username: robloxUser.name,
                    displayName: robloxUser.displayName ?? null,
                    avatarUrl,
                });
                if (!upsertResult.ok) {
                    logger.error({username: parsedPlayer.username, error: upsertResult.error}, "Failed to upsert player");
                    errors.push({row: parsedPlayer.rowNumber, message: `[${parsedTeam.teamName}] Failed to save player ${parsedPlayer.username}`});
                    rowsErrored++;
                    continue;
                }

                if (UNIQUE_ROLES.has(parsedPlayer.role)) {
                    const holderResult = await findPlayerByRole(supabase, team.id, config.season_id, parsedPlayer.role);
                    if (holderResult.ok && holderResult.value && holderResult.value.player_id !== upsertResult.value.id) {
                        await setPlayerRole(supabase, {
                            playerId: holderResult.value.player_id,
                            teamId: team.id,
                            seasonId: config.season_id,
                            role: 'player',
                        });
                    }
                }

                if (parsedPlayer.positionInvalid) {
                    errors.push({row: parsedPlayer.rowNumber, message: `[${parsedTeam.teamName}] ${parsedPlayer.username} has an unrecognized position — must be OH, OPP, MB, SET, or LIB`});
                    rowsErrored++;
                }

                const addResult = await addPlayerToTeam(supabase, {
                    playerId: upsertResult.value.id,
                    teamId: team.id,
                    seasonId: config.season_id,
                    role: parsedPlayer.role,
                    position: parsedPlayer.position,
                });
                if (!addResult.ok) {
                    logger.error({playerId: upsertResult.value.id, teamId: team.id, error: addResult.error}, "Failed to add player to team");
                    const otherTeam = sheetUsernameToTeams.get(uname)?.find(t => t !== parsedTeam.teamName);
                    errors.push({row: parsedPlayer.rowNumber, message: friendlyPlayerError(addResult.error.message, parsedPlayer.username, parsedTeam.teamName, 'add', otherTeam)});
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
