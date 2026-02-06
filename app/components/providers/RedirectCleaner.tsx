"use client"

import {useRouter, useSearchParams} from "next/navigation";
import {useEffect} from "react";

interface RedirectCleanerProps {
    redirectTo?: string;
}

export default function RedirectCleaner({redirectTo = "/"}: RedirectCleanerProps){
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        if(searchParams.has("redirect")){
            router.replace(redirectTo);
        }
    }, [router, searchParams, redirectTo]);

    return null
}