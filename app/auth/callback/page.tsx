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

    return <p>Signing you in...</p>;
}
