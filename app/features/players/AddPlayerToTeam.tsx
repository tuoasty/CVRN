"use client";

import { useState } from "react";
import Image from "next/image";
import { RobloxUserWithAvatar } from "@/shared/types/roblox";
import { savePlayerToTeamAction, searchPlayersAction } from "@/app/actions/player.actions";
import { clientLogger } from "@/app/utils/clientLogger";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";

interface Props {
    teamId: string;
    onSuccess: () => void;
}

export default function AddPlayerToTeam({ teamId, onSuccess }: Props) {
    const [username, setUsername] = useState("");
    const [users, setUsers] = useState<RobloxUserWithAvatar[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim()) {
            setError("Please enter a username");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        setUsers([]);

        try {
            const result = await searchPlayersAction(username);

            if (!result.ok) {
                clientLogger.error('AddPlayerToTeam', 'Search failed', { username, error: result.error });
                setError(result.error.message);
                return;
            }

            setUsers(result.value);

            if (result.value.length === 0) {
                setError("No users found");
            }
        } catch (error) {
            clientLogger.error('AddPlayerToTeam', 'Exception during search', { username, error });
            setError("Search failed");
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlayer = async (user: RobloxUserWithAvatar) => {
        setAdding(true);
        setError(null);
        setSuccess(null);

        try {
            const result = await savePlayerToTeamAction({
                robloxUserId: user.id,
                username: user.name,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                teamId: teamId,
            });

            if (!result.ok) {
                clientLogger.error('AddPlayerToTeam', 'Failed to add player', { userId: user.id, teamId, error: result.error });
                setError(result.error.message);
                return;
            }

            clientLogger.info('AddPlayerToTeam', 'Player added successfully', { userId: user.id, teamId });
            setSuccess(`${user.displayName} added successfully!`);
            setUsername("");
            setUsers([]);

            setTimeout(() => {
                onSuccess();
            }, 1000);
        } catch (error) {
            clientLogger.error('AddPlayerToTeam', 'Exception adding player', { userId: user.id, teamId, error });
            setError("Failed to add player");
        } finally {
            setAdding(false);
        }
    };

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
                        />
                        <Button type="submit" disabled={loading || adding} className="rounded-sm">
                            {loading ? "Searching..." : "Search"}
                        </Button>
                    </div>
                </div>
            </form>

            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-sm p-3">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-primary/10 border border-primary/20 rounded-sm p-3">
                    <p className="text-sm text-primary">{success}</p>
                </div>
            )}

            {users.length > 0 && (
                <div className="space-y-3">
                    <div className="text-sm font-medium">
                        Found {users.length} user{users.length !== 1 ? 's' : ''}
                    </div>
                    <div className="space-y-2">
                        {users.map((user) => (
                            <div
                                key={user.id.toString()}
                                className="panel p-4 flex items-center gap-4"
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
                                    onClick={() => handleAddPlayer(user)}
                                    disabled={adding}
                                    variant="default"
                                    className="rounded-sm shrink-0"
                                >
                                    {adding ? "Adding..." : "Add to Team"}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}