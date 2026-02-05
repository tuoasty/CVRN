"use client"

import {useState} from "react";
import {loginAction} from "@/app/actions/auth.actions";
import ErrorDisplay from "@/app/components/ui/ErrorDisplay";

export default function LoginPage(){
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e:React.SubmitEvent){
        e.preventDefault();
        setError(null);

        const result = await loginAction(email, password);

        if("error" in result){
            setError(result.error.message);
        } else {
            window.location.href = "/admin/dashboard"
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h1>Login</h1>
            <input
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}/>
            <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}/>

            <button type="submit">Login</button>
            {error && <ErrorDisplay message={error}></ErrorDisplay>}
        </form>
    )
}