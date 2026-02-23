"use client"

import Image from "next/image"
import { useState } from "react"
import { Player } from "@/shared/types/db"
import { removePlayerFromTeamAction } from "@/app/actions/player.actions"
import { Card, CardContent } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"

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
        <Card className="text-center w-fit">
            <CardContent className="flex flex-col items-center gap-2 p-4">
                {player.avatar_url && (
                    <Image
                        src={player.avatar_url}
                        alt={player.username || ""}
                        width={100}
                        height={100}
                        className="object-contain"
                    />
                )}

                <div>
                    <h4 className="font-medium text-sm">
                        {player.display_name || player.username}
                    </h4>
                    <p className="text-xs text-muted-foreground">@{player.username}</p>
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemove}
                    disabled={removing}
                >
                    {removing ? "Removing..." : "Remove"}
                </Button>
            </CardContent>
        </Card>
    )
}