"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/app/actions/auth.actions";
import { Button } from "@/app/components/ui/button";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
    className?: string;
    showLabel?: boolean;
}

export function LogoutButton({ className, showLabel }: LogoutButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        setLoading(true);
        try {
            await logoutAction();
        } finally {
            setLoading(false);
            router.push("/auth/login");
        }
    };

    return (
        <Button
            onClick={handleLogout}
            disabled={loading}
            variant="ghost"
            size="sm"
            className={cn("rounded-sm", className)}
        >
            <LogOut className={cn("w-4 h-4", showLabel && "mr-2")} />
            {showLabel && "Logout"}
        </Button>
    );
}