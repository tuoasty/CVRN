"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions/auth.actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const result = await loginAction(email, password);

        if ("error" in result) {
            setError(result.error.message);
            setLoading(false);
        } else {
            window.location.href = "/admin/dashboard";
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md rounded-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-center">CVRN Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                                className="rounded-sm"
                            />
                        </div>

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

                        <Button type="submit" disabled={loading} className="w-full rounded-sm">
                            {loading ? "Logging in..." : "Login"}
                        </Button>
                    </form>

                    {error && (
                        <div className="mt-4 p-3 rounded-sm border border-destructive bg-destructive/10 text-destructive text-sm">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}