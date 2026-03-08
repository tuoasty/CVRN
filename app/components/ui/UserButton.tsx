"use client";

import { User } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

export default function UserButton() {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        );

        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsAuthenticated(!!user);
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session?.user);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleClick = () => {
        if (isAuthenticated) {
            router.push("/admin/dashboard");
        } else {
            const returnUrl = pathname !== "/" ? `?returnUrl=${encodeURIComponent(pathname)}` : "";
            router.push(`/auth/login${returnUrl}`);
        }
    };

    if (isLoading) {
        return (
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-sm"
                disabled
            >
                <User className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-sm"
            onClick={handleClick}
        >
            <User className="h-4 w-4" />
        </Button>
    );
}