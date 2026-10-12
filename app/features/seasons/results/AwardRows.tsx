"use client";

import {SeasonAwardEntryWithPlayer} from "@/server/domains/season";
import {cn} from "@/lib/utils";
import {AwardThumb, EmptyRows, NewLabel, SectionHeader, TextAction} from "./ResultsUi";
import {StagedAward} from "./types";

const ROW = "grid h-8 w-full grid-cols-[24px_minmax(0,1.2fr)_minmax(0,1fr)] items-center gap-2 border-b border-border px-1 text-left text-sm last:border-b-0";

export const ROW_INTERACTIVE = cn(
    "cursor-pointer transition-colors duration-150 hover:bg-muted/30 motion-reduce:transition-none",
    "focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50",
);

function PlayerCell({username, team, isNew}: {username: string; team: string | null | undefined; isNew?: boolean}) {
    return (
        <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate">
                @{username}
                {team && <span className="text-muted-foreground"> · {team}</span>}
            </span>
            {isNew && <NewLabel />}
        </span>
    );
}

interface Props {
    title: string;
    emptyLabel: string;
    awards: SeasonAwardEntryWithPlayer[];
    staged: StagedAward[];
    editingId: string | null;
    armed: boolean;
    onAdd: () => void;
    onSelect: (award: SeasonAwardEntryWithPlayer) => void;
}

export function AwardRows({title, emptyLabel, awards, staged, editingId, armed, onAdd, onSelect}: Props) {
    return (
        <section>
            <SectionHeader title={title} meta={awards.length > 0 ? `${awards.length}` : undefined}>
                <TextAction armed={armed} aria-pressed={armed} onClick={onAdd}>+ Add award</TextAction>
            </SectionHeader>
            {awards.length === 0 && staged.length === 0 ? (
                <EmptyRows>{emptyLabel}</EmptyRows>
            ) : (
                <div>
                    {awards.map(a => (
                        <button
                            key={a.id}
                            type="button"
                            aria-label={`Edit ${a.award_name}, @${a.players.username}`}
                            aria-current={a.id === editingId || undefined}
                            onClick={() => onSelect(a)}
                            className={cn(ROW, ROW_INTERACTIVE, a.id === editingId && "bg-muted font-semibold hover:bg-muted")}
                        >
                            <AwardThumb url={a.full_avatar_url} name={a.players.username} />
                            <span className="truncate">{a.award_name}</span>
                            <PlayerCell username={a.players.username} team={a.players.season_team_name} />
                        </button>
                    ))}
                    {staged.map(s => (
                        <div key={s.tempId} className={ROW}>
                            <AwardThumb url={s.player.avatar_url} name={s.player.username ?? "?"} />
                            <span className="truncate">{s.awardName}</span>
                            <PlayerCell username={s.player.username ?? s.player.id} team={s.player.season_team_name} isNew />
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
