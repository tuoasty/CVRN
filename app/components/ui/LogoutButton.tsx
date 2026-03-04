"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/app/actions/auth.actions";
import { Button } from "@/app/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        setLoading(true);
        await logoutAction();
        router.push("/auth/login");
    };

    return (
        <Button
            onClick={handleLogout}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="rounded-sm"
        >
            <LogOut className="w-4 h-4 mr-2" />
            {loading ? "Logging out..." : "Logout"}
        </Button>
    );
}