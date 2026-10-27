"use client";

import {useEffect, type ReactNode} from "react";
import {ArrowDown, ArrowUp, ImageIcon, Loader2, Trash2, X} from "lucide-react";
import {Button} from "@/app/components/ui/button";
import {Input} from "@/app/components/ui/input";
import {OptionButton} from "@/app/components/filters/OptionRow";
import {AllStarSlot, AllStarTeamCode, SeasonAllStarTeam, SeasonAwardEntryWithPlayer} from "@/server/domains/season";
import type {LeagueSpec} from "@/server/domains/spec/types";
import {cn} from "@/lib/utils";
import {AwardNameCombobox} from "./AwardNameCombobox";
import {PlayerPicker} from "./PlayerPicker";
import {SpecCombobox} from "./SpecCombobox";
import {StarPicker, TextAction} from "./ResultsUi";
import {movability} from "./awardGroups";
import {stagedChipLabel} from "./stagedAwards";
import {BAR_CATEGORIES, CATEGORY_LABELS} from "./types";
import type {StagedAwardsState} from "./useStagedAwards";
import type {AwardEditor} from "./useAwardEditor";
import type {SpecWinnerEditor} from "./useSpecWinnerEditor";

const TEAMS: AllStarTeamCode[] = ["A", "B"];
const SLOTS: {value: AllStarSlot; label: string}[] = [
    {value: "starter", label: "Starter"},
    {value: "sub", label: "Sub"},
];

function Group({label, children}: {label: string; children: ReactNode}) {
    return (
        <div role="group" aria-label={label} className="flex items-center gap-0.5">
            <span aria-hidden className="mr-1 text-xs font-semibold text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}

function Divider() {
    return <span aria-hidden className="mx-2 h-4 w-px bg-border" />;
}

function Kbd({children, inverse}: {children: ReactNode; inverse?: boolean}) {
    return (
        <kbd className={cn(
            "border px-1 font-mono text-xs font-normal",
            inverse ? "border-primary-foreground/40 text-primary-foreground" : "border-border text-muted-foreground",
        )}>
            {children}
        </kbd>
    );
}

interface Props {
    seasonId: string;
    bar: StagedAwardsState;
    editor: AwardEditor;
    awards: SeasonAwardEntryWithPlayer[];
    allStarTeams: SeasonAllStarTeam[];
    specs: LeagueSpec[];
    winnerBySpec: ReadonlyMap<string, string>;
    specEditor: SpecWinnerEditor;
    stickyTop: number;
}

export function ResultsCommandBar({seasonId, bar, editor, awards, allStarTeams, specs, winnerBySpec, specEditor, stickyTop}: Props) {
    const {target, editing, editingSpec, staged, saving} = bar;
    const isAllStar = target.category === "all_star";
    const isSpec = target.category === "spec";
    const anyEditing = editing !== null || editingSpec !== null;
    const locked = anyEditing;
    const moves = editing ? movability(awards, editing) : {up: false, down: false};
    const specBusy = editingSpec !== null && specEditor.busyId === editingSpec.id;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !anyEditing && staged.length > 0) {
                e.preventDefault();
                bar.save();
            } else if (e.key === "Escape" && anyEditing) {
                bar.stopEdit();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [bar, anyEditing, staged.length]);

    const teamName = (code: AllStarTeamCode) => allStarTeams.find(t => t.code === code)?.name ?? `Team ${code}`;

    const onNameEnter = (value: string) => {
        if (editing) editor.apply(editing, value);
        else bar.playerRef.current?.focus();
    };

    return (
        <section
            aria-label={editing ? "Edit award" : editingSpec ? "Edit spec winner" : "Add awards"}
            className="panel sticky z-20 p-3"
            style={{top: stickyTop}}
        >
            <div className="flex flex-wrap items-center gap-y-1">
                <Group label="Category">
                    {BAR_CATEGORIES.map(c => (
                        <OptionButton
                            key={c.value}
                            density="compact"
                            selected={target.category === c.value}
                            aria-pressed={target.category === c.value}
                            disabled={locked}
                            className="disabled:pointer-events-none"
                            onClick={() => bar.setTarget(t => ({...t, category: c.value}))}
                        >
                            {c.label}
                        </OptionButton>
                    ))}
                </Group>
                <Divider />
                <Group label="Team">
                    {TEAMS.map(code => (
                        <OptionButton
                            key={code}
                            density="compact"
                            selected={isAllStar && target.team === code}
                            aria-pressed={isAllStar && target.team === code}
                            disabled={!isAllStar || locked}
                            title={teamName(code)}
                            className={cn("font-mono disabled:pointer-events-none", !isAllStar && "opacity-50")}
                            onClick={() => bar.setTarget(t => ({...t, team: code}))}
                        >
                            {code}
                        </OptionButton>
                    ))}
                </Group>
                <Divider />
                <Group label="Slot">
                    {SLOTS.map(s => (
                        <OptionButton
                            key={s.value}
                            density="compact"
                            selected={isAllStar && target.slot === s.value}
                            aria-pressed={isAllStar && target.slot === s.value}
                            disabled={!isAllStar || locked}
                            className={cn("disabled:pointer-events-none", !isAllStar && "opacity-50")}
                            onClick={() => bar.setTarget(t => ({...t, slot: s.value}))}
                        >
                            {s.label}
                        </OptionButton>
                    ))}
                </Group>
                <Divider />
                <Group label="Stars">
                    {editingSpec ? (
                        <StarPicker
                            label={`Stars for ${editingSpec.spec.name}`}
                            value={editingSpec.stars_awarded}
                            max={editingSpec.spec.stars}
                            disabled={specBusy}
                            onChange={n => specEditor.setStars(editingSpec, n)}
                        />
                    ) : (
                        <StarPicker
                            label="Stars awarded"
                            value={isSpec ? bar.stars : 0}
                            max={bar.spec?.stars}
                            disabled={!isSpec || !bar.spec || locked}
                            onChange={bar.setStars}
                        />
                    )}
                </Group>
            </div>

            <div className="mt-2 grid grid-cols-1 items-end gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                {editingSpec ? (
                    <div className="flex min-w-0 flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spec</span>
                        <div className="relative">
                            <Input
                                readOnly
                                aria-label="Spec"
                                value={editingSpec.spec.name}
                                className="rounded-md bg-muted/30 pr-24 font-semibold"
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2 text-xs text-muted-foreground">
                                {editingSpec.spec.position}
                                <span className="font-mono tabular-nums">★{editingSpec.spec.stars}</span>
                            </span>
                        </div>
                    </div>
                ) : isSpec ? (
                    <SpecCombobox
                        specs={specs}
                        query={bar.specQuery}
                        onQueryChange={bar.setSpecQuery}
                        selected={bar.spec}
                        onSelect={bar.selectSpec}
                        onEnter={() => bar.playerRef.current?.focus()}
                        winnerBySpec={winnerBySpec}
                        inputRef={bar.nameRef}
                    />
                ) : (
                    <AwardNameCombobox
                        value={bar.name}
                        onChange={bar.setName}
                        onEnter={onNameEnter}
                        suggestions={bar.suggestions}
                        categoryLabel={CATEGORY_LABELS[target.category]}
                        inputRef={bar.nameRef}
                    />
                )}
                <PlayerPicker
                    seasonId={seasonId}
                    query={bar.playerQuery}
                    onQueryChange={bar.setPlayerQuery}
                    inputRef={bar.playerRef}
                    placeholder={editing
                        ? `@${editing.players.username}, type to change`
                        : editingSpec
                            ? `@${editingSpec.player.username}, type to change`
                            : "Search username"}
                    hint={anyEditing ? "change" : "add"}
                    onCommit={player => {
                        if (editing) {
                            editor.apply(editing, bar.name, player);
                            bar.setPlayerQuery("");
                        } else if (editingSpec) {
                            specEditor.changePlayer(editingSpec, player);
                            bar.setPlayerQuery("");
                        } else {
                            bar.stage(player);
                        }
                    }}
                />
                {editingSpec ? (
                    <Button variant="outline" className="rounded-md" onClick={bar.stopEdit}>
                        Done <Kbd>Esc</Kbd>
                    </Button>
                ) : editing ? (
                    <div className="flex gap-2">
                        <Button
                            className="rounded-md"
                            disabled={editor.busy !== null}
                            onClick={() => editor.apply(editing, bar.name)}
                        >
                            {editor.busy === "apply" && <Loader2 className="animate-spin motion-reduce:animate-none" />}
                            Apply <Kbd inverse>↵</Kbd>
                        </Button>
                        <Button variant="outline" className="rounded-md" onClick={bar.stopEdit}>
                            Done <Kbd>Esc</Kbd>
                        </Button>
                    </div>
                ) : (
                    <Button className="rounded-md" disabled={staged.length === 0 || saving} onClick={bar.save}>
                        {saving && <Loader2 className="animate-spin motion-reduce:animate-none" />}
                        {staged.length === 0
                            ? "Save awards"
                            : `Save ${staged.length} award${staged.length === 1 ? "" : "s"}`}
                        <Kbd inverse>Ctrl ↵</Kbd>
                    </Button>
                )}
            </div>

            {editing && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2.5 text-xs">
                    <span className="min-w-0 truncate text-muted-foreground">
                        Editing <span className="font-semibold text-foreground">{editing.award_name}</span> · @{editing.players.username}
                        {editing.category === "all_star" && ` · ${teamName(editing.all_star_team ?? "A")} ${editing.all_star_slot === "sub" ? "Sub" : "Starter"}`}
                    </span>
                    {editing.category === "all_star" && editing.all_star_slot === "starter" && (
                        <TextAction disabled={editor.busy !== null} onClick={() => editor.toggleCaptain(editing)}>
                            {editing.all_star_captain ? "Remove captain" : "Make captain"}
                        </TextAction>
                    )}
                    <TextAction disabled={editor.busy !== null || editor.refreshingId !== null} onClick={() => editor.refreshAvatar(editing)}>
                        {editor.refreshingId === editing.id ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> : <ImageIcon className="size-3" />}
                        Refresh avatar
                    </TextAction>
                    <TextAction disabled={!moves.up || editor.busy !== null} onClick={() => editor.move(editing, "up")}>
                        <ArrowUp className="size-3" /> Move up
                    </TextAction>
                    <TextAction disabled={!moves.down || editor.busy !== null} onClick={() => editor.move(editing, "down")}>
                        <ArrowDown className="size-3" /> Move down
                    </TextAction>
                    <TextAction tone="danger" className="ml-auto" disabled={editor.busy !== null} onClick={() => editor.remove(editing)}>
                        <Trash2 className="size-3" /> Remove award
                    </TextAction>
                </div>
            )}

            {editingSpec && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2.5 text-xs">
                    <span className="min-w-0 truncate text-muted-foreground">
                        Editing <span className="font-semibold text-foreground">{editingSpec.spec.name}</span> · @{editingSpec.player.username}
                        {" · "}<span className="font-mono tabular-nums">{editingSpec.stars_awarded} / {editingSpec.spec.stars}</span>
                    </span>
                    {specBusy && <Loader2 aria-label="Saving" className="size-3 animate-spin motion-reduce:animate-none" />}
                    <TextAction tone="danger" className="ml-auto" disabled={specBusy} onClick={() => specEditor.remove(editingSpec)}>
                        <Trash2 className="size-3" /> Remove winner
                    </TextAction>
                </div>
            )}

            {staged.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5 text-xs">
                    <span className="mr-1 text-muted-foreground">Staged</span>
                    {staged.map(a => {
                        const label = stagedChipLabel(a);
                        return (
                            <span key={a.tempId} className="inline-flex h-6 items-center gap-1 border border-border pl-2">
                                <span className="max-w-72 truncate">{label}</span>
                                <button
                                    type="button"
                                    aria-label={`Remove staged ${label}`}
                                    onClick={() => bar.removeStaged(a.tempId)}
                                    className="inline-flex size-6 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
                                >
                                    <X className="size-3" />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
