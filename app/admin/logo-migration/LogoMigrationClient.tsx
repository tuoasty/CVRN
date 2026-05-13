"use client";

import { useState } from "react";
import Image from "next/image";
import {
    TeamForMigration,
    previewLogoProcessing,
    applyLogoProcessing,
} from "@/app/actions/logoMigration.actions";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";

type Status = "pending" | "previewing" | "preview-ready" | "complex-bg" | "applying" | "done" | "error";

type TeamState = {
    status: Status;
    processedBase64?: string;
    error?: string;
};

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
    previewing: { label: "Previewing…", className: "bg-blue-600/10 text-blue-600 border-blue-600/20" },
    "preview-ready": { label: "Preview ready", className: "bg-amber-600/10 text-amber-600 border-amber-600/20" },
    "complex-bg": { label: "Complex bg — skip", className: "bg-orange-600/10 text-orange-600 border-orange-600/20" },
    applying: { label: "Applying…", className: "bg-blue-600/10 text-blue-600 border-blue-600/20" },
    done: { label: "Done", className: "bg-green-600/10 text-green-600 border-green-600/20" },
    error: { label: "Error", className: "bg-red-600/10 text-red-600 border-red-600/20" },
};

export default function LogoMigrationClient({ teams }: { teams: TeamForMigration[] }) {
    const [states, setStates] = useState<Record<string, TeamState>>(
        Object.fromEntries(
            teams.map((t) => [t.id, { status: t.logo_bg_removed ? "done" : "pending" }])
        )
    );

    function update(teamId: string, patch: Partial<TeamState>) {
        setStates((prev) => ({ ...prev, [teamId]: { ...prev[teamId], ...patch } }));
    }

    async function handlePreview(team: TeamForMigration) {
        if (!team.logo_url) return;
        update(team.id, { status: "previewing" });
        const result = await previewLogoProcessing(team.logo_url);
        if (!result.ok) {
            update(team.id, { status: "error", error: result.error.message });
            return;
        }
        if (!result.value.bgRemoved) {
            update(team.id, { status: "complex-bg" });
            return;
        }
        update(team.id, { status: "preview-ready", processedBase64: result.value.processedBase64 });
    }

    async function handleApply(team: TeamForMigration) {
        if (!team.logo_url) return;
        update(team.id, { status: "applying" });
        const result = await applyLogoProcessing(team.id, team.logo_url);
        if (!result.ok) {
            update(team.id, { status: "error", error: result.error.message });
            return;
        }
        update(team.id, { status: "done" });
    }

    async function handleApplyAll() {
        const processable = teams.filter(
            (t) => states[t.id]?.status === "preview-ready" && t.logo_url
        );
        for (const team of processable) {
            await handleApply(team);
        }
    }

    const previewReadyCount = teams.filter((t) => states[t.id]?.status === "preview-ready").length;
    const doneCount = teams.filter((t) => states[t.id]?.status === "done").length;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Logo Migration</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {doneCount}/{teams.length} done · {previewReadyCount} ready to apply
                    </p>
                </div>
                {previewReadyCount > 0 && (
                    <Button onClick={handleApplyAll}>
                        Apply All Processable ({previewReadyCount})
                    </Button>
                )}
            </div>

            <div className="grid gap-4">
                {teams.map((team) => {
                    const state = states[team.id] ?? { status: "pending" };
                    const { label, className } = STATUS_CONFIG[state.status];

                    return (
                        <div key={team.id} className="border border-border rounded p-4 flex items-start gap-4">
                            <div className="flex gap-3 items-center shrink-0">
                                {team.logo_url && (
                                    <div className="relative w-16 h-16 bg-muted rounded border border-border">
                                        <Image
                                            src={team.logo_url}
                                            alt={team.name}
                                            fill
                                            className="object-contain"
                                            unoptimized
                                        />
                                    </div>
                                )}
                                {state.processedBase64 && (
                                    <>
                                        <span className="text-muted-foreground text-sm">→</span>
                                        <div
                                            className="relative w-16 h-16 rounded border border-border"
                                            style={{
                                                backgroundImage:
                                                    "linear-gradient(45deg,#aaa 25%,transparent 25%),linear-gradient(-45deg,#aaa 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#aaa 75%),linear-gradient(-45deg,transparent 75%,#aaa 75%)",
                                                backgroundSize: "8px 8px",
                                                backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
                                            }}
                                        >
                                            {/* checkerboard reveals transparency */}
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={`data:image/webp;base64,${state.processedBase64}`}
                                                alt="processed preview"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-semibold">{team.name}</p>
                                <Badge variant="outline" className={`mt-1 text-xs ${className}`}>
                                    {label}
                                </Badge>
                                {state.error && (
                                    <p className="text-red-600 text-xs mt-1">{state.error}</p>
                                )}
                            </div>

                            <div className="flex gap-2 shrink-0">
                                {(state.status === "pending" || state.status === "error" || state.status === "complex-bg") && (
                                    <Button variant="outline" size="sm" onClick={() => handlePreview(team)}>
                                        Preview
                                    </Button>
                                )}
                                {state.status === "previewing" && (
                                    <Button variant="outline" size="sm" disabled>
                                        Previewing…
                                    </Button>
                                )}
                                {state.status === "preview-ready" && (
                                    <>
                                        <Button variant="outline" size="sm" onClick={() => handlePreview(team)}>
                                            Re-preview
                                        </Button>
                                        <Button size="sm" onClick={() => handleApply(team)}>
                                            Apply
                                        </Button>
                                    </>
                                )}
                                {state.status === "applying" && (
                                    <Button size="sm" disabled>
                                        Applying…
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
