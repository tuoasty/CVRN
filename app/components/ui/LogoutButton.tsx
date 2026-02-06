"use client"

import {logoutAction} from "@/app/actions/auth.actions";
import {Button} from "@/app/components/ui/button";
import {useRouter} from "next/navigation";

export function LogoutButton(){
    const router = useRouter();

    const handleLogout = async () => {
        await logoutAction()
        router.push("/")
    }

    return (
        <Button onClick={handleLogout}>
            Logout
        </Button>
    )
}