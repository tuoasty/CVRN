"use client"

import {useState} from "react";
import {setPasswordAction} from "@/app/actions/auth.actions";
import {useRouter} from "next/navigation";

export default function SetPasswordPage(){
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const router = useRouter();

    async function handleSubmit(e: React.SubmitEvent) {
        e.preventDefault();

        if (password !== confirm) {
            setMessage("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setMessage("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        setMessage("");

        const result = await setPasswordAction(password);

        if (result.ok) {
            setMessage("Password set successfully. You are now authenticated");
            router.replace("/admin/dashboard");
        } else {
            setMessage(result.error.message);
        }

        setLoading(false);
    }

    return (
        <div style={{ maxWidth: 400, margin: "50px auto" }}>
            <h1>Set Your Password</h1>

            <form onSubmit={handleSubmit}>

                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label>Confirm Password</label>
                    <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Set Password"}
                </button>

            </form>

            {message && <p>{message}</p>}
        </div>
    );
}