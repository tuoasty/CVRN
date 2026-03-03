"use client";

import React, { useState } from "react";
import { useOfficialStore } from "@/app/stores/officialStore";
import { RobloxUserWithAvatar } from "@/shared/types/roblox";
import { clientLogger } from "@/app/utils/clientLogger";
import Image from "next/image";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/app/components/ui/dialog";
import { OfficialType } from "@/server/dto/matchOfficial.dto";

interface OfficialSearchDialogProps {
    matchId: string;
    officialType: OfficialType;
    onAssigned: () => void;
    trigger?: React.ReactNode;
}

export default function OfficialSearchDialog({
                                                 matchId,
                                                 officialType,
                                                 onAssigned,
                                                 trigger,
                                             }: OfficialSearchDialogProps) {
    const { searchOfficials, saveOfficial, assignOfficialToMatch, loading } = useOfficialStore();

    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<RobloxUserWithAvatar[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            return;
        }

        setSearching(true);
        clientLogger.info("OfficialSearchDialog", "Searching for officials", { query: searchQuery });

        try {
            const results = await searchOfficials(searchQuery.trim());
            setSearchResults(results);
            clientLogger.info("OfficialSearchDialog", "Search completed", { count: results.length });
        } catch (error) {
            clientLogger.error("OfficialSearchDialog", "Search failed", { error });
        } finally {
            setSearching(false);
        }
    };

    const handleAssign = async (user: RobloxUserWithAvatar) => {
        clientLogger.info("OfficialSearchDialog", "Assigning official", {
            matchId,
            robloxUserId: user.id,
            officialType,
        });

        const official = await saveOfficial(user.id, user.name, user.avatarUrl);

        if (!official) {
            alert("Failed to save official");
            return;
        }

        const success = await assignOfficialToMatch(matchId, official.id, officialType);

        if (success) {
            clientLogger.info("OfficialSearchDialog", "Official assigned successfully", {
                matchId,
                officialId: official.id,
            });
            setOpen(false);
            setSearchQuery("");
            setSearchResults([]);
            onAssigned();
        } else {
            alert("Failed to assign official to match");
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        Add {officialType === "referee" ? "Referee" : "Media"}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Add {officialType === "referee" ? "Referee" : "Media"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search Roblox username..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={searching || loading}
                        />
                        <Button
                            onClick={handleSearch}
                            disabled={searching || loading || !searchQuery.trim()}
                        >
                            {searching ? "Searching..." : "Search"}
                        </Button>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                                >
                                    <div className="flex items-center gap-3">
                                        {user.avatarUrl && (
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden">
                                                <Image
                                                    src={user.avatarUrl}
                                                    alt={user.name}
                                                    fill
                                                    sizes="40px"
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                ID: {user.id}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleAssign(user)}
                                        disabled={loading}
                                    >
                                        Assign
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {searchResults.length === 0 && searchQuery && !searching && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            No users found matching &quot;{searchQuery}&quot;
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}