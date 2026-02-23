"use client"

import Image from "next/image"
import { useState } from "react"
import { Player } from "@/shared/types/db"
import { removePlayerFromTeamAction } from "@/app/actions/player.actions"

interface Props {
    player: Player
    onRemoved: () => void
}

export default function PlayerCard({ player, onRemoved }: Props) {
    const [removing, setRemoving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleRemove = async () => {
        setRemoving(true)
        setError(null)

        const result = await removePlayerFromTeamAction({
            robloxUserId: player.roblox_user_id
        })

        if (!result.ok) {
            setError(result.error.message)
            setRemoving(false)
            return
        }

        onRemoved()
    }

    return (
        <div style={{
            border: "1px solid #ccc",
            padding: "1rem",
            borderRadius: "8px",
            textAlign: "center",
        }}>
            {player.avatar_url && (
                <Image
                    src={player.avatar_url}
                    alt={player.username || ""}
                    width={100}
                    height={100}
                    style={{ objectFit: "contain" }}
                />
            )}

            <h4 style={{ margin: "0.5rem 0 0.25rem 0" }}>
                {player.display_name || player.username}
            </h4>

            <p style={{ fontSize: "0.9rem", color: "#666", margin: 0 }}>
                @{player.username}
            </p>

            {error && <p style={{ color: "red", fontSize: "0.8rem" }}>{error}</p>}

            <button
                onClick={handleRemove}
                disabled={removing}
                style={{ marginTop: "0.5rem" }}
            >
                {removing ? "Removing..." : "Remove"}
            </button>
        </div>
    )
}