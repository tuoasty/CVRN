"use client";

import { useState } from "react";
import { setPasswordAction } from "@/app/actions/auth.actions";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export default function SetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (password !== confirm) {
            setMessage("Passwords do not match");
            setIsError(true);
            return;
        }

        if (password.length < 6) {
            setMessage("Password must be at least 6 characters");
            setIsError(true);
            return;
        }

        setLoading(true);
        setMessage("");
        setIsError(false);

        const result = await setPasswordAction(password);

        if (result.ok) {
            setMessage("Password set successfully. Redirecting...");
            setIsError(false);
            setTimeout(() => router.replace("/admin/dashboard"), 1500);
        } else {
            setMessage(result.error.message);
            setIsError(true);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md rounded-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-center">Set Your Password</CardTitle>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                        Create a secure password for your account
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                                className="rounded-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm">Confirm Password</Label>
                            <Input
                                id="confirm"
                                type="password"
                                placeholder="••••••••"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                disabled={loading}
                                required
                                className="rounded-sm"
                            />
                        </div>

                        <Button type="submit" disabled={loading} className="w-full rounded-sm">
                            {loading ? "Setting Password..." : "Set Password"}
                        </Button>
                    </form>

                    {message && (
                        <div
                            className={`mt-4 p-3 rounded-sm border text-sm ${
                                isError
                                    ? "bg-destructive/10 border-destructive text-destructive"
                                    : "bg-primary/10 border-primary text-primary"
                            }`}
                        >
                            {message}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}