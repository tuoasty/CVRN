"use client";

import { useState } from "react";
import { inviteUserAction } from "@/app/actions/admin.actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

export default function InvitePage() {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"super_admin" | "admin" | "stat_tracker">("stat_tracker");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage("");
        setIsSuccess(false);

        try {
            const result = await inviteUserAction(email, role);

            if (result.ok) {
                setMessage("Invitation sent successfully");
                setIsSuccess(true);
                setEmail("");
                setRole("stat_tracker");
            } else {
                setMessage(result.error.message);
                setIsSuccess(false);
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "An error occurred");
            setIsSuccess(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1>Invite User</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Send an invitation email to create a new admin account
                </p>
            </div>

            <Card className="rounded-sm">
                <CardHeader>
                    <CardTitle className="text-base">User Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="user@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubmitting}
                                required
                                className="rounded-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={role}
                                onValueChange={(value) => setRole(value as typeof role)}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger id="role" className="rounded-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stat_tracker">Stat Tracker</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Super Admin: Full access | Admin: Manage teams/matches | Stat Tracker: View only
                            </p>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="rounded-sm">
                            {isSubmitting ? "Sending Invitation..." : "Send Invitation"}
                        </Button>
                    </form>

                    {message && (
                        <div
                            className={`mt-4 p-3 rounded-sm border text-sm ${
                                isSuccess
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-destructive/10 border-destructive text-destructive"
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