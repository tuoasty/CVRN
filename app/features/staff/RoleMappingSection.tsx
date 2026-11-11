"use client";

import {useState} from "react";
import {ACCESS_GROUPS, type AccessGroup} from "@/shared/types/accessGroup";
import type {GuildRoleOption, StaffRole} from "@/server/domains/staff/types";
import {saveRoleMappingAction} from "@/app/actions/staff.actions";
import {OptionButton} from "@/app/components/filters/OptionRow";
import {Button} from "@/app/components/ui/button";
import {Input} from "@/app/components/ui/input";
import {Label} from "@/app/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import {toast} from "@/app/utils/toast";
import {GROUP_LABELS, groupList} from "./groupLabels";
import {planRoleMappingSave} from "./planRoleMappingSave";

type Props = {
    roles: StaffRole[];
    guildRoles: GuildRoleOption[];
    onSaved: () => Promise<unknown>;
};

const ROLE_ID_PATTERN = /^\d{1,25}$/;

function withGroup(current: AccessGroup[], group: AccessGroup): AccessGroup[] {
    return ACCESS_GROUPS.filter(g => g === group || current.includes(g));
}

function roleNames(roles: StaffRole[]): string {
    return roles.map(r => r.name ?? r.id).join(", ");
}

export function RoleMappingSection({roles, guildRoles, onSaved}: Props) {
    const [edits, setEdits] = useState<Record<string, AccessGroup[]>>({});
    const [added, setAdded] = useState<StaffRole[]>([]);
    const [saving, setSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [idInput, setIdInput] = useState("");
    const [idError, setIdError] = useState<string | null>(null);

    const savedIds = new Set(roles.map(r => r.id));
    const rows = [...added.filter(a => !savedIds.has(a.id)), ...roles];
    const plan = planRoleMappingSave(roles, added, edits);
    const dirty = plan.changes.length > 0 || added.some(a => !savedIds.has(a.id));
    const changedIds = new Set(plan.changes.map(c => c.roleId));

    const groupsOf = (role: StaffRole) => edits[role.id] ?? role.groups;

    function addRole(e: React.FormEvent) {
        e.preventDefault();
        const id = idInput.trim();
        if (!ROLE_ID_PATTERN.test(id)) {
            setIdError("Role IDs are numbers only. Copy one from Discord.");
            return;
        }
        if (rows.some(r => r.id === id)) {
            setIdError("That role is already in the list.");
            return;
        }
        const role = guildRoles.find(r => r.id === id);
        if (!role) {
            setIdError("No role with that ID on the Discord server.");
            return;
        }
        if (role.managed) {
            setIdError("Bot and Booster roles are managed by Discord and can't be mapped.");
            return;
        }
        setAdded(a => [{id: role.id, name: role.name, groups: [], deleted: false}, ...a]);
        setIdInput("");
        setIdError(null);
    }

    function toggle(role: StaffRole, group: AccessGroup) {
        const current = groupsOf(role);
        const next = current.includes(group) ? current.filter(g => g !== group) : withGroup(current, group);
        setEdits(e => ({...e, [role.id]: next}));
    }

    function removeRole(role: StaffRole) {
        if (!savedIds.has(role.id)) {
            setAdded(a => a.filter(x => x.id !== role.id));
            setEdits(e => {
                const next = {...e};
                delete next[role.id];
                return next;
            });
            return;
        }
        setEdits(e => ({...e, [role.id]: []}));
    }

    function clearAll() {
        setEdits(Object.fromEntries(rows.map(r => [r.id, [] as AccessGroup[]])));
    }

    function discard() {
        setEdits({});
        setAdded([]);
    }

    async function commit() {
        setConfirmOpen(false);
        if (plan.changes.length === 0) {
            discard();
            return;
        }
        setSaving(true);
        const result = await saveRoleMappingAction({changes: plan.changes});
        await onSaved();
        if (result.ok) {
            setEdits({});
            setAdded([]);
            toast.success("Role mapping saved");
        } else {
            toast.error("Couldn't save every change", result.error.message);
        }
        setSaving(false);
    }

    function requestSave() {
        if (plan.removed.length > 0 || plan.superAdminGrants.length > 0) setConfirmOpen(true);
        else void commit();
    }

    const changeCount = plan.changes.length;

    return (
        <section aria-labelledby="role-mapping-heading">
            <h2 id="role-mapping-heading" className="text-xl font-semibold tracking-tight text-foreground">Role mapping</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                Anyone holding a mapped role gets every group switched on for it. Nothing changes until you save, and a role saved with no groups is removed.
            </p>

            <form onSubmit={addRole} noValidate className="mt-4">
                <div className="flex flex-wrap items-end gap-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="add-role-id">Add a role by ID</Label>
                        <Input
                            id="add-role-id"
                            inputMode="numeric"
                            autoComplete="off"
                            value={idInput}
                            onChange={e => {
                                setIdInput(e.target.value);
                                setIdError(null);
                            }}
                            aria-invalid={idError !== null}
                            aria-describedby="add-role-message"
                            className="w-64 max-w-full rounded-sm font-mono tabular-nums max-md:h-11"
                        />
                    </div>
                    <Button type="submit" variant="outline" className="rounded-sm max-md:h-11">
                        Add role
                    </Button>
                </div>
                <p
                    id="add-role-message"
                    role={idError ? "alert" : undefined}
                    className={idError ? "mt-1.5 text-sm text-foreground" : "mt-1.5 text-xs text-muted-foreground"}
                >
                    {idError ?? "In Discord, turn on Developer Mode, then right-click a role in Server Settings and choose Copy Role ID."}
                </p>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    className="rounded-sm max-md:h-11 disabled:cursor-not-allowed"
                    disabled={!dirty || saving}
                    onClick={requestSave}
                >
                    {saving ? "Saving..." : "Save changes"}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    className="rounded-sm max-md:h-11 disabled:cursor-not-allowed"
                    disabled={!dirty || saving}
                    onClick={discard}
                >
                    Discard
                </Button>
                <span className="text-sm text-muted-foreground" aria-live="polite">
                    {changeCount === 0 ? "" : changeCount === 1 ? "1 unsaved change" : `${changeCount} unsaved changes`}
                </span>
                <Button
                    type="button"
                    variant="outline"
                    className="ml-auto rounded-sm max-md:h-11 disabled:cursor-not-allowed"
                    disabled={rows.length === 0 || saving}
                    onClick={clearAll}
                >
                    Clear all mappings
                </Button>
            </div>

            {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                    No roles are mapped yet. Add one by its ID to give its members access.
                </p>
            ) : (
                <ul className="mt-4 divide-y divide-border/30">
                    {rows.map(role => {
                        const groups = groupsOf(role);
                        const name = role.name ?? role.id;
                        const goingAway = savedIds.has(role.id) && groups.length === 0;
                        const note = goingAway ? "Removed when you save" : changedIds.has(role.id) ? "Unsaved" : null;
                        return (
                            <li key={role.id} className="grid gap-2 py-3 md:grid-cols-[14rem_1fr_auto] md:items-center md:gap-4">
                                <div className="min-w-0">
                                    {role.deleted ? (
                                        <span className="text-sm text-muted-foreground">
                                            Deleted role <span className="font-mono tabular-nums">{role.id}</span>
                                        </span>
                                    ) : (
                                        <span className="break-words text-sm font-medium text-foreground">{role.name}</span>
                                    )}
                                    {note && <span className="block text-xs text-muted-foreground">{note}</span>}
                                </div>

                                {role.deleted ? (
                                    <span className="text-sm text-muted-foreground">
                                        {groups.length > 0 ? `Was mapped to ${groupList(groups)}` : "No groups"}
                                    </span>
                                ) : (
                                    <div role="group" aria-label={`Groups for ${name}`} className="flex min-w-0 flex-wrap gap-0.5">
                                        {ACCESS_GROUPS.map(group => {
                                            const on = groups.includes(group);
                                            return (
                                                <OptionButton
                                                    key={group}
                                                    density="compact"
                                                    selected={on}
                                                    aria-pressed={on}
                                                    disabled={saving}
                                                    className="max-md:h-11 disabled:cursor-not-allowed disabled:opacity-60"
                                                    onClick={() => toggle(role, group)}
                                                >
                                                    {GROUP_LABELS[group]}
                                                </OptionButton>
                                            );
                                        })}
                                    </div>
                                )}

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="justify-self-start rounded-sm max-md:h-11 disabled:cursor-not-allowed"
                                    disabled={saving || goingAway}
                                    aria-label={`Remove role ${name}`}
                                    onClick={() => removeRole(role)}
                                >
                                    Remove role
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            )}

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="rounded-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Save these changes?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                {plan.removed.length > 0 && (
                                    <p>
                                        {plan.removed.length === 1 ? "This role is left" : "These roles are left"} with no groups and will be removed: {roleNames(plan.removed)}. Their members lose that access on their next request.
                                    </p>
                                )}
                                {plan.superAdminGrants.length > 0 && (
                                    <p>
                                        {plan.superAdminGrants.length === 1 ? "This role gets" : "These roles get"} super admin, which includes this page and the deletes only super admins can run: {roleNames(plan.superAdminGrants)}.
                                    </p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm">Keep editing</AlertDialogCancel>
                        <AlertDialogAction className="rounded-sm" onClick={() => void commit()}>
                            Save changes
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
