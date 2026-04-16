"use client";

import { User } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {useEffect, useState, useTransition} from "react";

export default function UserButton() {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        );

        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setIsAuthenticated(!!user);

            if (user) {
                const { data: roleData } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", user.id)
                    .single();

                setIsAdmin(!!roleData?.role);
            }

            setIsLoading(false);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session?.user);
            if (!session?.user) {
                setIsAdmin(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleClick = () => {
        if (!isAuthenticated) {
            const returnUrl = encodeURIComponent(pathname);
            startTransition(() => {
                router.push(`/auth/login?returnUrl=${returnUrl}`);
            });
            return;
        }

        const isOnAdminRoute = pathname.startsWith("/admin");

        if (isAdmin) {
            startTransition(() => {
                router.push(isOnAdminRoute ? "/home" : "/admin/dashboard");
            });
        } else {
            startTransition(() => {
                router.push("/home");
            });
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
        <>
            {isPending && (
                <div className="fixed top-[80px] left-0 right-0 bottom-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            )}
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-sm"
                onClick={handleClick}
            >
                <User className="h-4 w-4" />
            </Button>
        </>
    );
}