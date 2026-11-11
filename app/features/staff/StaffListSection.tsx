"use client";

import {useState} from "react";
import {ACCESS_GROUPS, type AccessGroup} from "@/shared/types/accessGroup";
import type {StaffAccount, StaffBlocks} from "@/server/domains/staff/types";
import {setUserBlocksAction} from "@/app/actions/staff.actions";
import {OptionButton} from "@/app/components/filters/OptionRow";
import {Button} from "@/app/components/ui/button";
import {toast} from "@/app/utils/toast";
import {GROUP_LABELS, groupList} from "./groupLabels";

type Props = {
    accounts: StaffAccount[];
    onSaved: () => Promise<unknown>;
};

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
];

function verifiedLabel(iso: string | null, now: number): string {
    if (!iso) return "Never verified";
    const seconds = Math.round((Date.parse(iso) - now) / 1000);
    const rtf = new Intl.RelativeTimeFormat("en", {numeric: "auto"});
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size) return `Verified ${rtf.format(Math.round(seconds / size), unit)}`;
    }
    return "Verified just now";
}

function blockedGroups(blocked: StaffBlocks): AccessGroup[] {
    return Array.isArray(blocked) ? blocked : [];
}

export function StaffListSection({accounts, onSaved}: Props) {
    const [pending, setPending] = useState<Record<string, StaffBlocks>>({});
    const now = Date.now();

    const blocksOf = (account: StaffAccount): StaffBlocks =>
        account.userId in pending ? pending[account.userId] : account.blocked;

    async function save(account: StaffAccount, blocked: StaffBlocks) {
        setPending(p => ({...p, [account.userId]: blocked}));
        const result = await setUserBlocksAction({userId: account.userId, blocked});
        if (!result.ok) toast.error("Couldn't save the block", result.error.message);
        else await onSaved();
        setPending(p => {
            const next = {...p};
            delete next[account.userId];
            return next;
        });
    }

    function toggle(account: StaffAccount, group: AccessGroup) {
        const current = blockedGroups(blocksOf(account));
        const next = current.includes(group)
            ? current.filter(g => g !== group)
            : ACCESS_GROUPS.filter(g => g === group || current.includes(g));
        void save(account, next.length > 0 ? next : null);
    }

    return (
        <section aria-labelledby="staff-heading">
            <h2 id="staff-heading" className="text-xl font-semibold tracking-tight text-foreground">People</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                Everyone who has signed in with Discord. A block removes a group from one person whatever roles they hold.
            </p>

            {accounts.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                    No one has signed in with Discord yet. People appear here after their first sign-in.
                </p>
            ) : (
                <ul className="mt-4 divide-y divide-border/30">
                    {accounts.map(account => {
                        const blocked = blocksOf(account);
                        const saving = account.userId in pending;
                        const name = account.displayName ?? account.username ?? "Unnamed account";
                        const candidates = ACCESS_GROUPS.filter(g => account.groups.includes(g) || blockedGroups(blocked).includes(g));
                        return (
                            <li key={account.userId} className="grid gap-x-4 gap-y-2 py-3 md:grid-cols-[16rem_1fr]">
                                <div className="flex min-w-0 items-center gap-3">
                                    {account.avatarUrl ? (
                                        <img src={account.avatarUrl} alt="" width={32} height={32} className="size-8 shrink-0 object-cover" />
                                    ) : (
                                        <span aria-hidden className="size-8 shrink-0 bg-muted" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {account.username ? `@${account.username} · ` : ""}
                                            {verifiedLabel(account.verifiedAt, now)}
                                        </p>
                                    </div>
                                </div>

                                <div className="min-w-0 space-y-1">
                                    <p className="text-sm text-foreground">
                                        {account.isOwner
                                            ? "Owner, every group"
                                            : blocked === "all"
                                                ? "Blocked from every group"
                                                : account.groups.length > 0
                                                    ? groupList(account.groups)
                                                    : <span className="text-muted-foreground">No groups</span>}
                                    </p>

                                    {!account.isOwner && (
                                        <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                                            {blocked !== "all" && candidates.length > 0 && (
                                                <div role="group" aria-label={`Blocked groups for ${name}`} className="flex flex-wrap items-center gap-0.5">
                                                    <span className="mr-1 text-xs font-semibold text-muted-foreground">Block</span>
                                                    {candidates.map(group => {
                                                        const on = blockedGroups(blocked).includes(group);
                                                        return (
                                                            <OptionButton
                                                                key={group}
                                                                density="compact"
                                                                selected={on}
                                                                aria-pressed={on}
                                                                disabled={saving}
                                                                className="max-md:h-11 disabled:cursor-not-allowed disabled:opacity-60"
                                                                onClick={() => toggle(account, group)}
                                                            >
                                                                {GROUP_LABELS[group]}
                                                            </OptionButton>
                                                        );
                                                    })}
                                                    <span aria-hidden className="mx-1 h-4 w-px bg-border" />
                                                </div>
                                            )}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="rounded-sm max-md:h-11 disabled:cursor-not-allowed"
                                                disabled={saving}
                                                onClick={() => void save(account, blocked === "all" ? null : "all")}
                                            >
                                                {blocked === "all" ? "Unblock all" : "Block all"}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
