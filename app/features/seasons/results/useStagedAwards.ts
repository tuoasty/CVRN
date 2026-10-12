"use client";

import {useCallback, useEffect, useReducer, useRef, useState} from "react";
import {batchUpsertSeasonAwardsAction, getAwardNameSuggestionsAction} from "@/app/actions/season.actions";
import {PlayerWithTeamInfo} from "@/server/domains/player";
import {SeasonAwardEntryWithPlayer} from "@/server/domains/season";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";
import {stagedAwardsReducer, toBatchAwards} from "./stagedAwards";
import {BarCategory, BarTarget, isBarCategory} from "./types";

const DEFAULT_TARGET: BarTarget = {category: "individual_winners", team: "A", slot: "starter"};

export function useStagedAwards(seasonId: string, awards: SeasonAwardEntryWithPlayer[], onSaved: (awards: SeasonAwardEntryWithPlayer[]) => void) {
    const [target, setTarget] = useState<BarTarget>(DEFAULT_TARGET);
    const [name, setName] = useState("");
    const [playerQuery, setPlayerQuery] = useState("");
    const [staged, dispatch] = useReducer(stagedAwardsReducer, []);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<Partial<Record<BarCategory, string[]>>>({});
    const requested = useRef(new Set<BarCategory>());
    const nameRef = useRef<HTMLInputElement | null>(null);
    const playerRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const category = target.category;
        if (requested.current.has(category)) return;
        requested.current.add(category);
        getAwardNameSuggestionsAction({category})
            .then(res => {
                if (res.ok) setSuggestions(prev => ({...prev, [category]: res.value}));
                else requested.current.delete(category);
            })
            .catch(err => {
                requested.current.delete(category);
                clientLogger.error("useStagedAwards", "Failed to load award name suggestions", {err});
            });
    }, [target.category]);

    const focusName = useCallback(() => {
        requestAnimationFrame(() => nameRef.current?.focus());
    }, []);

    const arm = useCallback((next: Partial<BarTarget>) => {
        setEditingId(null);
        setTarget(prev => ({...prev, ...next}));
        focusName();
    }, [focusName]);

    const stage = useCallback((player: PlayerWithTeamInfo) => {
        if (!name.trim()) {
            nameRef.current?.focus();
            return false;
        }
        dispatch({type: "add", tempId: crypto.randomUUID(), target, awardName: name, player});
        setName("");
        setPlayerQuery("");
        focusName();
        return true;
    }, [name, target, focusName]);

    const removeStaged = useCallback((tempId: string) => dispatch({type: "remove", tempId}), []);

    const save = useCallback(async () => {
        if (staged.length === 0 || saving) return;
        setSaving(true);
        try {
            const result = await batchUpsertSeasonAwardsAction({seasonId, awards: toBatchAwards(staged)});
            if (!result.ok) {
                toast.error("Failed to save awards", result.error.message);
                return;
            }
            onSaved(result.value);
            setSuggestions(prev => {
                const next = {...prev};
                for (const a of [...staged].reverse()) {
                    const list = next[a.category];
                    if (!list) continue;
                    next[a.category] = [a.awardName, ...list.filter(n => n.toLowerCase() !== a.awardName.toLowerCase())];
                }
                return next;
            });
            toast.success(`${staged.length} award${staged.length === 1 ? "" : "s"} saved`);
            dispatch({type: "clear"});
        } catch (err) {
            clientLogger.error("useStagedAwards", "Batch save failed", {err});
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    }, [staged, saving, seasonId, onSaved]);

    const startEdit = useCallback((award: SeasonAwardEntryWithPlayer) => {
        if (!isBarCategory(award.category)) return;
        setEditingId(award.id);
        setTarget(prev => ({
            category: award.category as BarCategory,
            team: award.all_star_team ?? prev.team,
            slot: award.all_star_slot ?? prev.slot,
        }));
        setName(award.award_name);
        setPlayerQuery("");
        focusName();
    }, [focusName]);

    const stopEdit = useCallback(() => {
        setEditingId(null);
        setName("");
        setPlayerQuery("");
    }, []);

    const editing = editingId ? awards.find(a => a.id === editingId) ?? null : null;

    return {
        target,
        setTarget,
        arm,
        name,
        setName,
        playerQuery,
        setPlayerQuery,
        staged,
        stage,
        removeStaged,
        save,
        saving,
        editing,
        startEdit,
        stopEdit,
        suggestions: suggestions[target.category] ?? [],
        nameRef,
        playerRef,
    };
}

export type StagedAwardsState = ReturnType<typeof useStagedAwards>;
