"use client";

import { useState } from "react";
import {inviteUserAction} from "@/app/actions/admin.actions";

export default function InvitePage() {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"super_admin" | "admin" | "stat_tracker">("stat_tracker");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage("");

        try {
            const result = await inviteUserAction(email, role);

            console.log(result)
            if (result.ok) {
                setMessage("Invitation sent successfully");
                setEmail("");
            } else {
                setMessage(result.error.message);
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <h1>Invite User</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="role">Role</label>
                    <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as typeof role)}
                        required
                    >
                        <option value="stat_tracker">Stat Tracker</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                    </select>
                </div>

                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Invite"}
                </button>
            </form>

            {message && <p>{message}</p>}
        </div>
    );
}