"use client"

import {useState} from "react";
import {RobloxUserWithAvatar} from "@/shared/types/roblox";
import {savePlayerToTeamAction, searchPlayersAction} from "@/app/actions/player.actions";
import Image from "next/image";

interface Props {
    teamId: string;
    onSuccess: () => void;
}

export default function AddPlayerToTeam({teamId, onSuccess}: Props){
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
                setError(result.error.message);
                return;
            }

            setUsers(result.value);

            if (result.value.length === 0) {
                setError("No users found");
            }
        } catch (error) {
            console.log(error);
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
                setError(result.error.message);
                return;
            }

            setSuccess(`${user.displayName} added successfully!`);
            setUsername("");
            setUsers([]);

            setTimeout(() => {
                onSuccess();
            }, 1000);
        } catch (error) {
            console.log(error);
            setError("Failed to add player");
        } finally {
            setAdding(false);
        }
    };

    return (
        <div style={{
            marginTop: "1rem",
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9"
        }}>
            <h3 style={{ margin: "0 0 1rem 0" }}>Search Roblox Player</h3>

            <form onSubmit={handleSearch} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter Roblox username"
                        disabled={loading || adding}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" disabled={loading || adding}>
                        {loading ? "Searching..." : "Search"}
                    </button>
                </div>
            </form>

            {error && <div style={{ color: "red", marginBottom: "0.5rem" }}>{error}</div>}
            {success && <div style={{ color: "green", marginBottom: "0.5rem" }}>{success}</div>}

            {users.length > 0 && (
                <div>
                    <h4 style={{ margin: "0 0 0.5rem 0" }}>Found {users.length} user(s):</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {users.map((user) => (
                            <div
                                key={user.id.toString()}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "1rem",
                                    padding: "0.75rem",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px",
                                    backgroundColor: "white",
                                }}
                            >
                                <Image
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    width={60}
                                    height={60}
                                    style={{ objectFit: "contain", borderRadius: "4px" }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: "bold" }}>
                                        {user.displayName}
                                        {user.hasVerifiedBadge && (
                                            <span style={{ color: "#0066cc", marginLeft: "0.25rem" }}>
                                                ✓
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: "0.9rem", color: "#666" }}>
                                        @{user.name}
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "#999" }}>
                                        ID: {user.id.toString()}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAddPlayer(user)}
                                    disabled={adding}
                                    style={{ whiteSpace: "nowrap" }}
                                >
                                    {adding ? "Adding..." : "Add to Team"}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}