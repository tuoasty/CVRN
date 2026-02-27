"use client"

import { useState } from "react";
import Image from "next/image";
import { RobloxUserWithAvatar } from "@/shared/types/roblox";
import { savePlayerToTeamAction, searchPlayersAction } from "@/app/actions/player.actions";
import { clientLogger } from "@/app/utils/clientLogger";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
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
        <Card>
            <CardHeader>
                <CardTitle>Search Roblox Player</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter Roblox username"
                        disabled={loading || adding}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={loading || adding}>
                        {loading ? "Searching..." : "Search"}
                    </Button>
                </form>

                {error && <div className="text-sm text-destructive">{error}</div>}
                {success && <div className="text-sm text-green-600">{success}</div>}

                {users.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Found {users.length} user(s):</h4>
                        <div className="space-y-2">
                            {users.map((user) => (
                                <Card key={user.id.toString()}>
                                    <CardContent className="flex items-center gap-4 p-4">
                                        <Image
                                            src={user.avatarUrl}
                                            alt={user.name}
                                            width={60}
                                            height={60}
                                            className="w-[60px] h-auto rounded object-contain"
                                        />
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{user.displayName}</span>
                                                {user.hasVerifiedBadge && (
                                                    <Badge variant="secondary" className="text-blue-600">
                                                        ✓
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                @{user.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {user.id.toString()}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleAddPlayer(user)}
                                            disabled={adding}
                                            variant="outline"
                                        >
                                            {adding ? "Adding..." : "Add to Team"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}