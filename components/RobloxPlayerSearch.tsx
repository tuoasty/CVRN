"use client"

import React, {useState} from "react";
import {getRobloxUsers} from "@/lib/service/robloxService";
import {RobloxUserWithAvatar} from "@/lib/types/robloxUserWithAvatar";
import Image from "next/image";

export default function RobloxPlayerSearch(){
    const [username, setUsername] = useState("");
    const [users, setUsers] = useState<RobloxUserWithAvatar[]>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!username.trim()){
            return;
        }

        setLoading(true);
        setError(null);
        setUsers([]);

        const result = await getRobloxUsers(username);
        setLoading(false);
        if(!result.ok){
            setError(result.error.message);
            return;
        }

        setUsers(result.value);
    }

    return (
        <div>
            <form onSubmit={handleSearch}>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Roblox username"
                />
                <button type="submit" disabled={loading}>
                    {loading ? "Searching..." : "Search"}
                </button>
            </form>

            {error && <div>Error: {error}</div>}

            {users != null && users.length > 0 && (
                <div>
                    <h2>Search Results:</h2>
                    {users.map((user) => (
                        <div key={user.id.toString()}>
                            <p>Requested Username: {user.requestedUsername}</p>
                            <p>ID: {user.id.toString()}</p>
                            <p>Name: {user.name}</p>
                            <p>Display Name: {user.displayName}</p>
                            <p>Has Verified Badge: {user.hasVerifiedBadge ? "Yes" : "No"}</p>
                            <Image src={user.avatarUrl}
                                   alt={"Roblox Avatar"}
                                   width={150}
                                   height={150}/>
                            <hr />
                        </div>
                    ))}
                </div>
            )}

            {!loading && users != null && users.length === 0 && username && !error && (
                <div>No users found</div>
            )}
        </div>
    );
}