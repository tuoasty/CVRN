"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loginAction, signInWithDiscordAction } from "@/app/actions/auth.actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

const ERROR_COPY: Record<string, string> = {
    no_role: "Your Discord account has no staff role on the CVR server.",
    discord_unavailable: "Couldn't reach Discord. Try again in a minute.",
    failed: "Sign-in failed. Try again.",
};

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get("returnUrl");
    const errorKey = searchParams.get("error");

    const [discordLoading, setDiscordLoading] = useState(false);
    const [startError, setStartError] = useState<string | null>(null);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [legacyError, setLegacyError] = useState<string | null>(null);
    const [legacyLoading, setLegacyLoading] = useState(false);

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

    async function handleLegacy(e: React.FormEvent) {
        e.preventDefault();
        setLegacyError(null);
        setLegacyLoading(true);
        const result = await loginAction(email, password);
        if ("error" in result) {
            setLegacyError(result.error.message);
            setLegacyLoading(false);
            return;
        }
        setLegacyLoading(false);
        router.push(returnUrl ?? "/admin/dashboard");
    }

    const message = startError ?? (errorKey ? ERROR_COPY[errorKey] ?? ERROR_COPY.failed : null);

    return (
        <div className="page-narrow flex min-h-[calc(100vh-6rem)] items-center">
            <div className="w-full max-w-sm">
                <h1 className="text-2xl font-semibold">CVRN Staff</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Staff only. Sign in with the Discord account that holds your CVRN staff role.
                </p>

                <Button onClick={handleDiscord} disabled={discordLoading} className="mt-6 w-full rounded-sm">
                    {discordLoading ? "Opening Discord..." : "Log in with Discord"}
                </Button>

                {message && (
                    <p role="alert" className="mt-4 text-sm text-destructive">
                        {message}
                    </p>
                )}

                <details className="mt-10 text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Email sign-in (old accounts)
                    </summary>
                    <form onSubmit={handleLegacy} className="mt-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={legacyLoading}
                                required
                                className="rounded-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={legacyLoading}
                                required
                                className="rounded-sm"
                            />
                        </div>
                        <Button type="submit" variant="outline" disabled={legacyLoading} className="w-full rounded-sm">
                            {legacyLoading ? "Signing in..." : "Sign in with email"}
                        </Button>
                        {legacyError && <p role="alert" className="text-destructive">{legacyError}</p>}
                    </form>
                </details>
            </div>
        </div>
    );
}
