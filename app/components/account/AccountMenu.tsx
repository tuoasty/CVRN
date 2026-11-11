"use client";

import Link from "next/link";
import {useEffect, useRef, useState} from "react";
import {usePathname, useRouter} from "next/navigation";
import {cn} from "@/lib/utils";
import {createBrowserSupabase} from "@/server/supabase/browser";
import {logoutAction} from "@/app/actions/auth.actions";
import {Popover, PopoverContent, PopoverTrigger} from "@/app/components/ui/popover";
import {isAccessGroup, type AccessGroup} from "@/shared/types/accessGroup";
import {accountMenuLink, type AccountMenuVariant} from "./accountMenuLink";

type Account = {
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
    groups: AccessGroup[];
};

const ITEM = cn(
    "flex h-9 w-full items-center px-3 text-left text-sm text-foreground transition-colors duration-150 motion-reduce:transition-none max-lg:h-11",
    "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-60",
);

function useAccount(): Account | null {
    const [account, setAccount] = useState<Account | null>(null);

    useEffect(() => {
        const supabase = createBrowserSupabase();
        let cancelled = false;

        async function load() {
            const {data: {user}} = await supabase.auth.getUser();
            if (!user) {
                if (!cancelled) setAccount(null);
                return;
            }
            const [row, groups] = await Promise.all([
                supabase
                    .from("user_accounts")
                    .select("discord_display_name, discord_username, discord_avatar_url")
                    .eq("user_id", user.id)
                    .maybeSingle(),
                supabase.rpc("current_groups"),
            ]);
            if (cancelled) return;
            const data = row.data;
            setAccount({
                displayName: data?.discord_display_name ?? data?.discord_username ?? "Account",
                username: data?.discord_username ?? null,
                avatarUrl: data?.discord_avatar_url ?? null,
                groups: Array.isArray(groups.data) ? groups.data.filter(isAccessGroup) : [],
            });
        }

        void load().catch(() => {
            if (!cancelled) setAccount(null);
        });

        const {data: {subscription}} = supabase.auth.onAuthStateChange(event => {
            if (event === "SIGNED_OUT") setAccount(null);
            if (event === "SIGNED_IN") setTimeout(() => void load().catch(() => undefined), 0);
        });

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    return account;
}

function AccountAvatar({account}: {account: Account}) {
    if (account.avatarUrl) {
        return <img src={account.avatarUrl} alt="" width={28} height={28} className="size-7 object-cover" />;
    }
    return (
        <span aria-hidden className="flex size-7 items-center justify-center bg-muted text-xs font-semibold text-muted-foreground">
            {account.displayName.charAt(0).toUpperCase()}
        </span>
    );
}

export function AccountMenu({variant, leadingDivider = false}: {variant: AccountMenuVariant; leadingDivider?: boolean}) {
    const account = useAccount();
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const lastPath = useRef(pathname);

    useEffect(() => {
        if (lastPath.current !== pathname) {
            lastPath.current = pathname;
            setOpen(false);
        }
    }, [pathname]);

    if (!account) return null;

    const link = accountMenuLink(variant, account.groups);

    async function logOut() {
        setLoggingOut(true);
        try {
            await logoutAction();
        } finally {
            setLoggingOut(false);
            setOpen(false);
            router.push("/");
            router.refresh();
        }
    }

    return (
        <>
            {leadingDivider && <div aria-hidden className="h-6 w-px bg-border" />}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label={account.displayName}
                        className={cn(
                            "flex size-10 shrink-0 items-center justify-center lg:size-8",
                            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        )}
                    >
                        <AccountAvatar account={account} />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    align="end"
                    sideOffset={6}
                    className={cn(
                        "w-56 rounded-none border-border bg-popover p-0 py-1 shadow-lg",
                        "data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 motion-reduce:animate-none",
                    )}
                >
                    <div className="px-3 pb-2 pt-1.5">
                        <p className="truncate text-sm font-semibold text-foreground">{account.displayName}</p>
                        {account.username && <p className="truncate text-xs text-muted-foreground">@{account.username}</p>}
                    </div>
                    {link && (
                        <Link href={link.href} className={ITEM} onClick={() => setOpen(false)}>
                            {link.label}
                        </Link>
                    )}
                    <button type="button" className={ITEM} disabled={loggingOut} onClick={() => void logOut()}>
                        {loggingOut ? "Logging out" : "Log out"}
                    </button>
                </PopoverContent>
            </Popover>
        </>
    );
}
