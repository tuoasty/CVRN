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
    const [, startTransition] = useTransition();

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
                    const { data: roleData } = await supabase
                        .from("user_roles")
                        .select("role")
                        .eq("user_id", user.id)
                        .single();

                    setIsAdmin(!!roleData?.role);
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
            const userId = session.user.id;
            setTimeout(async () => {
                const { data: roleData } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", userId)
                    .single();
                setIsAdmin(!!roleData?.role);
            }, 0);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleClick = () => {
        if (!isAuthenticated) {
            startTransition(() => {
                router.push("/auth/login");
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