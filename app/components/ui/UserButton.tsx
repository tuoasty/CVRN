"use client";

import { User } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {useEffect, useState} from "react";

export default function UserButton() {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        );

        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setIsAuthenticated(!!user);
                setIsLoading(false);

                if (user) {
                    const { data: groups } = await supabase.rpc("current_groups");
                    setIsAdmin(Array.isArray(groups) && groups.length > 0);
                }
            } catch {
                setIsLoading(false);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session?.user);
            if (!session?.user) {
                setIsAdmin(false);
                return;
            }
            setTimeout(async () => {
                const { data: groups } = await supabase.rpc("current_groups");
                setIsAdmin(Array.isArray(groups) && groups.length > 0);
            }, 0);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleClick = () => {
        if (!isAuthenticated) {
            router.push("/auth/login");
            return;
        }

        const isOnAdminRoute = pathname.startsWith("/admin");

        if (isAdmin) {
            router.push(isOnAdminRoute ? "/" : "/admin/dashboard");
        } else {
            router.push("/");
        }
    };

    if (isLoading) {
        return (
            <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-sm"
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
                className="h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-sm"
                onClick={handleClick}
            >
                <User className="h-4 w-4" />
            </Button>
    );
}