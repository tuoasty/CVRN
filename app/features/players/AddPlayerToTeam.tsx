"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { RobloxUserWithAvatar } from "@/shared/types/roblox";
import {
    savePlayerToTeamAction,
    searchPlayersAction,
    searchPlayersInDatabaseAction,
    addExistingPlayerToTeamAction
} from "@/app/actions/player.actions";
import { clientLogger } from "@/app/utils/clientLogger";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { PlayerWithTeamInfo } from "@/server/dto/player.dto";
import {toast} from "@/app/utils/toast";

interface Props {
    teamId: string;
    seasonId: string;
    onSuccess: () => void;
}

export default function AddPlayerToTeam({ teamId, seasonId, onSuccess }: Props) {
    const [username, setUsername] = useState("");
    const [dbSuggestions, setDbSuggestions] = useState<PlayerWithTeamInfo[]>([]);
    const [robloxResults, setRobloxResults] = useState<RobloxUserWithAvatar[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    const searchDatabase = useCallback(async (query: string) => {
        if (!query.trim()) {
            setDbSuggestions([]);
            setRobloxResults([]);
            return;
        }

        setRobloxResults([]);

        try {
            const result = await searchPlayersInDatabaseAction({ query });

            if (result.ok) {
                setDbSuggestions(result.value);
            } else {
                clientLogger.error('AddPlayerToTeam', 'DB search failed', { query, error: result.error });
                setDbSuggestions([]);
            }
        } catch (error) {
            clientLogger.error('AddPlayerToTeam', 'Exception during DB search', { query, error });
            setDbSuggestions([]);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            searchDatabase(username);
        }, 300);

        return () => clearTimeout(timer);
    }, [username, searchDatabase]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim()) {
            toast.error("Please enter a username");
            return;
        }

        setLoading(true);
        setRobloxResults([]);

        try {
            const result = await searchPlayersAction(username);

            if (!result.ok) {
                clientLogger.error('AddPlayerToTeam', 'Roblox search failed', { username, error: result.error });
                toast.error(result.error.message);
                return;
            }

            setRobloxResults(result.value);

            if (result.value.length === 0 && dbSuggestions.length === 0) {
                toast.error("No users found");
            }
        } catch (error) {
            clientLogger.error('AddPlayerToTeam', 'Exception during Roblox search', { username, error });
            toast.error("Search failed");
        } finally {
            setLoading(false);
        }
    };

    const handleAddRobloxPlayer = async (user: RobloxUserWithAvatar) => {
        setAdding(true);

        try {
            const result = await savePlayerToTeamAction({
                robloxUserId: user.id,
                username: user.name,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                teamId: teamId,
            });

            if (!result.ok) {
                clientLogger.error('AddPlayerToTeam', 'Failed to add Roblox player', { userId: user.id, teamId, error: result.error });
                toast.error(result.error.message);
                return;
            }

            clientLogger.info('AddPlayerToTeam', 'Roblox player added successfully', { userId: user.id, teamId });
            toast.success(`${user.displayName} added successfully!`);
            setUsername("");
            setRobloxResults([]);
            setDbSuggestions([]);

            setTimeout(() => {
                onSuccess();
            }, 1000);
        } catch (error) {
            clientLogger.error('AddPlayerToTeam', 'Exception adding Roblox player', { userId: user.id, teamId, error });
            toast.error("Failed to add player");
        } finally {
            setAdding(false);
        }
    };

    const handleAddDbPlayer = async (player: PlayerWithTeamInfo) => {
        if (player.current_team_id && player.current_season_id === seasonId) {
            toast.error("Player is already in another team for this season");
            return;
        }

        setAdding(true);

        try {
            const result = await addExistingPlayerToTeamAction({
                playerId: player.id,
                teamId: teamId,
            });

            if (!result.ok) {
                clientLogger.error('AddPlayerToTeam', 'Failed to add DB player', { playerId: player.id, teamId, error: result.error });
                toast.error(result.error.message);
                return;
            }

            clientLogger.info('AddPlayerToTeam', 'DB player added successfully', { playerId: player.id, teamId });
            toast.success(`${player.display_name || player.username} added successfully!`);
            setUsername("");
            setRobloxResults([]);
            setDbSuggestions([]);

            setTimeout(() => {
                onSuccess();
            }, 1000);
        } catch (error) {
            clientLogger.error('AddPlayerToTeam', 'Exception adding DB player', { playerId: player.id, teamId, error });
            toast.error("Failed to add player");
        } finally {
            setAdding(false);
        }
    };

    const hasResults = robloxResults.length > 0 || dbSuggestions.length > 0;

    return (
        <div className="space-y-5">
            <div>
                <h3>Search Roblox Player</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Search for a Roblox user to add to the team
                </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-3">
                <div className="space-y-2">
                    <Label htmlFor="username">Roblox Username</Label>
                    <div className="flex gap-2">
                        <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            disabled={loading || adding}
                            className="flex-1 rounded-sm"
                            autoComplete="off"
                        />
                        <Button type="submit" disabled={loading || adding} className="rounded-sm">
                            {loading ? "Searching..." : "Search"}
                        </Button>
                    </div>
                </div>
            </form>

            {hasResults && (
                <div className="space-y-2">
                    {robloxResults.map((user) => (
                        <div
                            key={`roblox-${user.id.toString()}`}
                            className="panel p-4 flex items-center gap-4 border-l-4 border-l-blue-500/50 bg-blue-500/5"
                        >
                            <div className="relative w-16 h-16 rounded-sm overflow-hidden border border-border shrink-0">
                                <Image
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    fill
                                    sizes="64px"
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold truncate">{user.displayName}</span>
                                    {user.hasVerifiedBadge && (
                                        <Badge variant="secondary" className="text-primary rounded-sm">
                                            ✓
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                    @{user.name}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                    ID: {user.id.toString()}
                                </div>
                            </div>
                            <Button
                                onClick={() => handleAddRobloxPlayer(user)}
                                disabled={adding}
                                variant="default"
                                className="rounded-sm shrink-0"
                            >
                                {adding ? "Adding..." : "Add to Team"}
                            </Button>
                        </div>
                    ))}

                    {dbSuggestions.map((player) => {
                        const isInTeam = player.current_team_id !== null && player.current_season_id === seasonId;

                        return (
                            <div
                                key={`db-${player.id}`}
                                className="panel p-4 flex items-center gap-4 border-l-4 border-l-amber-500/50 bg-amber-500/5"
                            >
                                <div className="relative w-16 h-16 rounded-sm overflow-hidden border border-border shrink-0">
                                    {player.avatar_url ? (
                                        <Image
                                            src={player.avatar_url}
                                            alt={player.username || "Player"}
                                            fill
                                            sizes="64px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-muted" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">
                                        {player.display_name || player.username}
                                    </div>
                                    <div className="text-sm text-muted-foreground truncate">
                                        @{player.username}
                                    </div>
                                    {isInTeam && player.current_team_name && (
                                        <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <span>Currently in</span>
                                            <span className="font-semibold">{player.current_team_name}</span>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    onClick={() => handleAddDbPlayer(player)}
                                    disabled={adding || isInTeam}
                                    variant={isInTeam ? "outline" : "default"}
                                    className="rounded-sm shrink-0"
                                >
                                    {isInTeam ? "In Team" : adding ? "Adding..." : "Add to Team"}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}