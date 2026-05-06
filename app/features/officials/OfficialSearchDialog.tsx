"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { searchOfficials, saveOfficial, assignOfficialToMatch } from "@/app/hooks/useOfficials";
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
import { OfficialType } from "@/server/domains/matchOfficial";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "@/app/utils/toast";
import {getOfficialByExactUsernameAction, searchOfficialsInDatabaseAction} from "@/app/actions/matchOfficial.actions";
import { OfficialWithInfo } from "@/server/domains/official";

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

    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [dbSuggestions, setDbSuggestions] = useState<OfficialWithInfo[]>([]);
    const [robloxResults, setRobloxResults] = useState<RobloxUserWithAvatar[]>([]);
    const [searching, setSearching] = useState(false);
    const [assigning, setAssigning] = useState<string | null>(null);
    const [searchSubmitted, setSearchSubmitted] = useState(false);
    const lastSearchedQuery = useRef("");

    const searchDatabase = useCallback(async (query: string) => {
        if (!query.trim()) {
            setDbSuggestions([]);
            setRobloxResults([]);
            return;
        }

        if (searchSubmitted && query === lastSearchedQuery.current) {
            return;
        }

        setRobloxResults([]);

        try {
            const result = await searchOfficialsInDatabaseAction({ query });

            if (result.ok) {
                setDbSuggestions(result.value);
            } else {
                clientLogger.error('OfficialSearchDialog', 'DB search failed', { query, error: result.error });
                setDbSuggestions([]);
            }
        } catch (error) {
            clientLogger.error('OfficialSearchDialog', 'Exception during DB search', { query, error });
            setDbSuggestions([]);
        }
    }, [searchSubmitted]);

    useEffect(() => {
        const timer = setTimeout(() => {
            searchDatabase(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, searchDatabase]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            toast.error("Please enter a username");
            return;
        }

        setSearching(true);
        setSearchSubmitted(true);
        lastSearchedQuery.current = searchQuery;
        clientLogger.info("OfficialSearchDialog", "Searching for officials", { query: searchQuery });

        try {
            const exactMatchResult = await getOfficialByExactUsernameAction({query:searchQuery});

            if (!exactMatchResult.ok) {
                clientLogger.error('OfficialSearchDialog', 'Exact match search failed', { username: searchQuery, error: exactMatchResult.error });
            } else if (exactMatchResult.value) {
                setDbSuggestions([exactMatchResult.value]);
                setRobloxResults([]);
                setSearching(false);
                return;
            }

            const results = await searchOfficials(searchQuery.trim());
            setRobloxResults(results);
            clientLogger.info("OfficialSearchDialog", "Roblox search completed", { count: results.length });

            if (results.length === 0 && dbSuggestions.length === 0) {
                toast.error("No users found");
            }
        } catch (error) {
            clientLogger.error("OfficialSearchDialog", "Search failed", { error });
            toast.error("Search failed");
        } finally {
            setSearching(false);
        }
    };

    const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setSearchSubmitted(false);
    };

    const handleAssignRoblox = async (user: RobloxUserWithAvatar) => {
        setAssigning(user.id.toString());
        clientLogger.info("OfficialSearchDialog", "Assigning Roblox official", {
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
            toast.success(`${user.displayName || user.name} assigned successfully`);
            setOpen(false);
            setSearchQuery("");
            setRobloxResults([]);
            setDbSuggestions([]);
            setSearchSubmitted(false);
            lastSearchedQuery.current = "";
            onAssigned();
        } else {
            toast.error("Failed to assign official to match");
        }

        setAssigning(null);
    };

    const handleAssignDb = async (official: OfficialWithInfo) => {
        setAssigning(official.id);
        clientLogger.info("OfficialSearchDialog", "Assigning DB official", {
            matchId,
            officialId: official.id,
            officialType,
        });

        const success = await assignOfficialToMatch(matchId, official.id, officialType);

        if (success) {
            clientLogger.info("OfficialSearchDialog", "DB official assigned successfully", {
                matchId,
                officialId: official.id,
            });
            toast.success(`${official.display_name || official.username} assigned successfully`);
            setOpen(false);
            setSearchQuery("");
            setRobloxResults([]);
            setDbSuggestions([]);
            setSearchSubmitted(false);
            lastSearchedQuery.current = "";
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

    const hasResults = robloxResults.length > 0 || dbSuggestions.length > 0;

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
                                onChange={handleSearchQueryChange}
                                onKeyPress={handleKeyPress}
                                disabled={searching}
                                className="flex-1 rounded-sm"
                                autoComplete="off"
                            />
                            <Button
                                onClick={handleSearch}
                                disabled={searching || !searchQuery.trim()}
                                className="rounded-sm"
                            >
                                {searching ? "Searching..." : "Search"}
                            </Button>
                        </div>
                    </div>

                    {hasResults && (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {robloxResults.map((user) => (
                                <div
                                    key={`roblox-${user.id}`}
                                    className="panel p-3 flex items-center justify-between border-l-4 border-l-blue-500/50 bg-blue-500/5"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {user.avatarUrl && (
                                            <div className="relative w-10 h-10 rounded-sm overflow-hidden border border-border shrink-0">
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
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleAssignRoblox(user)}
                                        disabled={assigning === user.id.toString()}
                                        className="rounded-sm shrink-0"
                                    >
                                        {assigning === user.id.toString() ? "Assigning..." : "Assign"}
                                    </Button>
                                </div>
                            ))}

                            {dbSuggestions.map((official) => (
                                <div
                                    key={`db-${official.id}`}
                                    className="panel p-3 flex items-center justify-between border-l-4 border-l-amber-500/50 bg-amber-500/5"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {official.avatar_url && (
                                            <div className="relative w-10 h-10 rounded-sm overflow-hidden border border-border shrink-0">
                                                <Image
                                                    src={official.avatar_url}
                                                    alt={official.username}
                                                    fill
                                                    sizes="40px"
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="font-medium truncate">
                                                {official.display_name || official.username}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                @{official.username}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleAssignDb(official)}
                                        disabled={assigning === official.id}
                                        className="rounded-sm shrink-0"
                                    >
                                        {assigning === official.id ? "Assigning..." : "Assign"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {!hasResults && searchQuery && !searching && (
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