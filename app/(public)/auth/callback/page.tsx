"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authCallbackAction } from "@/app/actions/auth.actions";

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        async function handleCallback() {
            const url = window.location.href;
            const result = await authCallbackAction(url);

            if (result.ok) {
                router.replace("/auth/set-password");
            } else {
                console.error(result.error);
                router.replace("/auth/login");
            }
        }

        handleCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Signing you in...</p>
            </div>
        </div>
    );
}