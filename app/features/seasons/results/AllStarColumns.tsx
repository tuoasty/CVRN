"use client";

import {useEffect, useState} from "react";
import {AllStarSlot, AllStarTeamCode, SeasonAllStarTeam, SeasonAwardEntryWithPlayer} from "@/server/domains/season";
import {cn} from "@/lib/utils";
import {AvatarRefreshButton, AwardThumb, CaptainMark, EmptyRows, NewLabel, SectionHeader, SubLabel, TextAction} from "./ResultsUi";
import {ROW_INTERACTIVE} from "./AwardRows";
import {awardsIn} from "./awardGroups";
import {StagedAward} from "./types";

const TEAMS: AllStarTeamCode[] = ["A", "B"];

export const POSITION_CELLS = "grid h-8 w-full grid-cols-[24px_48px_minmax(0,1fr)] items-center gap-2 px-1 text-left text-sm";
export const POSITION_ROW = cn(POSITION_CELLS, "border-b border-border");
export const ACTION_ROW = "group flex h-8 items-center border-b border-border pr-1";

function TeamNameInput({code, value, onSave}: {code: AllStarTeamCode; value: string; onSave: (name: string) => void}) {
    const [text, setText] = useState(value);
    useEffect(() => { setText(value); }, [value]);

    const commit = () => {
        const next = text.trim();
        if (next && next !== value) onSave(next);
        else setText(value);
    };

    return (
        <input
            aria-label={`All-Star team ${code} name`}
            value={text}
            maxLength={40}
            placeholder={`Team ${code}`}
            onChange={e => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { e.stopPropagation(); setText(value); e.currentTarget.blur(); }
            }}
            className={cn(
                "h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-sm font-semibold placeholder:font-normal placeholder:text-muted-foreground",
                "transition-[color,box-shadow,border-color] duration-150 hover:border-border focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none",
            )}
        />
    );
}

interface SlotRowsProps {
    awards: SeasonAwardEntryWithPlayer[];
    staged: StagedAward[];
    editingId: string | null;
    refreshingId: string | null;
    onSelect: (award: SeasonAwardEntryWithPlayer) => void;
    onRefreshAvatar: (award: SeasonAwardEntryWithPlayer) => void;
}

function SlotRows({awards, staged, editingId, refreshingId, onSelect, onRefreshAvatar}: SlotRowsProps) {
    return (
        <div className="[&>*:last-child]:border-b-0">
            {awards.map(a => (
                <div key={a.id} className={cn(ACTION_ROW, a.id === editingId && "bg-muted")}>
                    <button
                        type="button"
                        aria-label={`Edit ${a.award_name}, @${a.players.username}${a.all_star_captain ? ", captain" : ""}`}
                        aria-current={a.id === editingId || undefined}
                        onClick={() => onSelect(a)}
                        className={cn(POSITION_CELLS, "min-w-0 flex-1", ROW_INTERACTIVE, a.id === editingId && "font-semibold hover:bg-muted")}
                    >
                        <AwardThumb url={a.full_avatar_url} name={a.players.username} />
                        <span className="truncate text-xs text-muted-foreground" title={a.award_name}>{a.award_name}</span>
                        <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate">@{a.players.username}</span>
                            {a.all_star_captain && <CaptainMark />}
                        </span>
                    </button>
                    <AvatarRefreshButton
                        username={a.players.username}
                        busy={refreshingId === a.id}
                        disabled={refreshingId !== null}
                        onClick={() => onRefreshAvatar(a)}
                    />
                </div>
            ))}
            {staged.map(s => (
                <div key={s.tempId} className={POSITION_ROW}>
                    <AwardThumb url={s.player.avatar_url} name={s.player.username ?? "?"} />
                    <span className="truncate text-xs text-muted-foreground" title={s.awardName}>{s.awardName}</span>
                    <span className="flex min-w-0 items-baseline gap-1.5">
                        <span className="truncate">@{s.player.username ?? s.player.id}</span>
                        <NewLabel />
                    </span>
                </div>
            ))}
        </div>
    );
}

interface Props {
    awards: SeasonAwardEntryWithPlayer[];
    staged: StagedAward[];
    allStarTeams: SeasonAllStarTeam[];
    editingId: string | null;
    armedTeam: AllStarTeamCode | null;
    refreshingId: string | null;
    onAdd: (team: AllStarTeamCode) => void;
    onSelect: (award: SeasonAwardEntryWithPlayer) => void;
    onRefreshAvatar: (award: SeasonAwardEntryWithPlayer) => void;
    onRenameTeam: (code: AllStarTeamCode, name: string) => void;
}

export function AllStarColumns({awards, staged, allStarTeams, editingId, armedTeam, refreshingId, onAdd, onSelect, onRefreshAvatar, onRenameTeam}: Props) {
    const total = awards.filter(a => a.category === "all_star").length;

    const slotStaged = (team: AllStarTeamCode, slot: AllStarSlot) =>
        staged.filter(s => s.category === "all_star" && s.allStarTeam === team && s.allStarSlot === slot);

    return (
        <section>
            <SectionHeader title="All-Star" meta={total > 0 ? `${total} player${total === 1 ? "" : "s"}` : undefined} />
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                {TEAMS.map(code => {
                    const starters = awardsIn(awards, "all_star", code, "starter");
                    const subs = awardsIn(awards, "all_star", code, "sub");
                    const stagedStarters = slotStaged(code, "starter");
                    const stagedSubs = slotStaged(code, "sub");
                    const empty = starters.length + subs.length + stagedStarters.length + stagedSubs.length === 0;
                    return (
                        <div key={code} className="min-w-0">
                            <div className="mt-1 flex items-center gap-1.5">
                                <span className="w-3 shrink-0 font-mono text-xs font-semibold text-muted-foreground">{code}</span>
                                <TeamNameInput
                                    code={code}
                                    value={allStarTeams.find(t => t.code === code)?.name ?? ""}
                                    onSave={name => onRenameTeam(code, name)}
                                />
                                <TextAction
                                    armed={armedTeam === code}
                                    aria-pressed={armedTeam === code}
                                    aria-label={`Add All-Star team ${code} award`}
                                    onClick={() => onAdd(code)}
                                >
                                    + Add
                                </TextAction>
                            </div>
                            {empty ? (
                                <EmptyRows>No players yet</EmptyRows>
                            ) : (
                                <>
                                    <SubLabel>Starters</SubLabel>
                                    <SlotRows awards={starters} staged={stagedStarters} editingId={editingId} refreshingId={refreshingId} onSelect={onSelect} onRefreshAvatar={onRefreshAvatar} />
                                    {(subs.length > 0 || stagedSubs.length > 0) && (
                                        <>
                                            <SubLabel split>Subs</SubLabel>
                                            <SlotRows awards={subs} staged={stagedSubs} editingId={editingId} refreshingId={refreshingId} onSelect={onSelect} onRefreshAvatar={onRefreshAvatar} />
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
