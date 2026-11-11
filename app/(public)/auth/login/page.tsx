"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithDiscordAction } from "@/app/actions/auth.actions";
import { Button } from "@/app/components/ui/button";

const ERROR_COPY: Record<string, string> = {
    no_role: "Your Discord account has no staff role on the CVR server.",
    discord_unavailable: "Couldn't reach Discord. Try again in a minute.",
    failed: "Sign-in failed. Try again.",
};

export default function LoginPage() {
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get("returnUrl");
    const errorKey = searchParams.get("error");

    const [discordLoading, setDiscordLoading] = useState(false);
    const [startError, setStartError] = useState<string | null>(null);

    async function handleDiscord() {
        setStartError(null);
        setDiscordLoading(true);
        const result = await signInWithDiscordAction(returnUrl);
        if (!result.ok) {
            setStartError(ERROR_COPY.failed);
            setDiscordLoading(false);
            return;
        }
        window.location.href = result.value.url;
    }

    const message = startError ?? (errorKey ? ERROR_COPY[errorKey] ?? ERROR_COPY.failed : null);

    return (
        <div className="page-narrow flex min-h-[calc(100vh-6rem)] items-center">
            <div className="w-full max-w-sm">
                <h1 className="text-2xl font-semibold">CVR Staff</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Staff only. Sign in with the Discord account that holds your CVR staff role.
                </p>

                <Button onClick={handleDiscord} disabled={discordLoading} className="mt-6 w-full rounded-sm">
                    {discordLoading ? "Opening Discord..." : "Log in with Discord"}
                </Button>

                {message && (
                    <p role="alert" className="mt-4 text-sm text-destructive">
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}
