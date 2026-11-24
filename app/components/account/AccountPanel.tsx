"use client";

import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {cn} from "@/lib/utils";
import {logoutAction} from "@/app/actions/auth.actions";
import {drawerLabelClass, drawerRowClass, rowStyle, type DrawerSize} from "@/app/components/public/navigation/island/IslandDrawer";
import {accountMenuLink} from "./accountMenuLink";
import type {Account} from "./AccountMenu";

export function AccountPanel({account, size, onNavigate}: {account: Account; size: DrawerSize; onNavigate?(): void}) {
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);
    const link = accountMenuLink("public", account.groups);

    async function logOut() {
        setLoggingOut(true);
        try {
            await logoutAction();
        } finally {
            setLoggingOut(false);
            onNavigate?.();
            router.push("/");
            router.refresh();
        }
    }

    return (
        <div className="py-1.5">
            <div className={cn("island-row px-3.5 pb-2 pt-1.5", size === "row" && "pt-2")} style={rowStyle(0)}>
                <p className="truncate text-sm font-semibold text-foreground">{account.displayName}</p>
                {account.username && <p className="truncate text-xs text-muted-foreground">@{account.username}</p>}
            </div>
            {link && (
                <Link href={link.href} onClick={onNavigate} className={drawerRowClass(size)} style={rowStyle(1)}>
                    <span className={drawerLabelClass()}>{link.label}</span>
                </Link>
            )}
            <button
                type="button"
                disabled={loggingOut}
                onClick={() => void logOut()}
                className={cn(drawerRowClass(size), "disabled:cursor-not-allowed disabled:opacity-60")}
                style={rowStyle(link ? 2 : 1)}
            >
                <span className={drawerLabelClass()}>{loggingOut ? "Logging out" : "Log out"}</span>
            </button>
        </div>
    );
}
