"use client";

import React, { useState } from "react";
import { useOfficialStore } from "@/app/stores/officialStore";
import { RobloxUserWithAvatar } from "@/shared/types/roblox";
import { clientLogger } from "@/app/utils/clientLogger";
import Image from "next/image";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/app/components/ui/dialog";
import { OfficialType } from "@/server/dto/matchOfficial.dto";
import { Badge } from "@/app/components/ui/badge";

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
    const [assigning, setAssigning] = useState<string | null>(null);

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
        setAssigning(user.id.toString());
        clientLogger.info("OfficialSearchDialog", "Assigning official", {
            matchId,
            robloxUserId: user.id,
            officialType,
        });

        const official = await saveOfficial(user.id, user.name, user.avatarUrl, user.displayName);

        if (!official) {
            toast.error("Failed to save official");
            setAssigning(null);
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
            toast.error("Failed to assign official to match");
        }

        setAssigning(null);
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
                    <Button variant="outline" size="sm" className="rounded-sm">
                        + Add {officialType === "referee" ? "Referee" : "Media"}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-sm">
                <DialogHeader>
                    <DialogTitle>
                        Add {officialType === "referee" ? "Referee" : "Media"}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Search for a Roblox user to assign
                    </p>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="search">Roblox Username</Label>
                        <div className="flex gap-2">
                            <Input
                                id="search"
                                placeholder="Enter username"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={searching || loading}
                                className="flex-1 rounded-sm"
                            />
                            <Button
                                onClick={handleSearch}
                                disabled={searching || loading || !searchQuery.trim()}
                                className="rounded-sm"
                            >
                                {searching ? "Searching..." : "Search"}
                            </Button>
                        </div>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            <div className="text-sm font-medium mb-2">
                                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
                            </div>
                            {searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    className="panel p-3 flex items-center justify-between hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {user.avatarUrl && (
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border shrink-0">
                                                <Image
                                                    src={user.avatarUrl}
                                                    alt={user.name}
                                                    fill
                                                    sizes="40px"
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium truncate">{user.displayName || user.name}</span>
                                                {user.hasVerifiedBadge && (
                                                    <Badge variant="secondary" className="rounded-sm text-primary">
                                                        ✓
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                @{user.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono">
                                                ID: {user.id}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleAssign(user)}
                                        disabled={loading || assigning === user.id.toString()}
                                        className="rounded-sm shrink-0"
                                    >
                                        {assigning === user.id.toString() ? "Assigning..." : "Assign"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {searchResults.length === 0 && searchQuery && !searching && (
                        <div className="panel p-8">
                            <p className="text-muted-foreground text-center text-sm">
                                No users found matching &quot;{searchQuery}&quot;
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}