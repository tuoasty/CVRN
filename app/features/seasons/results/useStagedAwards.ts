"use client";

import {useCallback, useEffect, useReducer, useRef, useState} from "react";
import {batchUpsertSeasonAwardsAction, getAwardNameSuggestionsAction} from "@/app/actions/season.actions";
import {awardSpecWinnerAction} from "@/app/actions/spec.actions";
import {PlayerWithTeamInfo} from "@/server/domains/player";
import {SeasonAwardEntryWithPlayer} from "@/server/domains/season";
import {SpecWinnerWithRefs} from "@/server/domains/spec";
import type {LeagueSpec} from "@/server/domains/spec/types";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";
import {stagedAwardsReducer, toBatchAwards} from "./stagedAwards";
import {AwardBarCategory, BarCategory, BarTarget, isBarCategory, isStagedAward, isStagedSpec} from "./types";

const DEFAULT_TARGET: BarTarget = {category: "individual_winners", team: "A", slot: "starter"};

interface Options {
    seasonId: string;
    awards: SeasonAwardEntryWithPlayer[];
    specWinners: SpecWinnerWithRefs[];
    initialSuggestions?: Partial<Record<AwardBarCategory, string[]>>;
    onAwardsSaved: (awards: SeasonAwardEntryWithPlayer[]) => void;
    onSpecSaved: (winner: SpecWinnerWithRefs) => void;
}

export function useStagedAwards({seasonId, awards, specWinners, initialSuggestions = {}, onAwardsSaved, onSpecSaved}: Options) {
    const [target, setTarget] = useState<BarTarget>(DEFAULT_TARGET);
    const [name, setName] = useState("");
    const [spec, setSpec] = useState<LeagueSpec | null>(null);
    const [specQuery, setSpecQuery] = useState("");
    const [stars, setStars] = useState(0);
    const [playerQuery, setPlayerQuery] = useState("");
    const [staged, dispatch] = useReducer(stagedAwardsReducer, []);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<Partial<Record<AwardBarCategory, string[]>>>(initialSuggestions);
    const requested = useRef(new Set(Object.keys(initialSuggestions) as AwardBarCategory[]));
    const nameRef = useRef<HTMLInputElement | null>(null);
    const playerRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const category = target.category;
        if (category === "spec" || requested.current.has(category)) return;
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
        setEditingSpecId(null);
        setTarget(prev => ({...prev, ...next}));
        focusName();
    }, [focusName]);

    const selectSpec = useCallback((next: LeagueSpec | null) => {
        setSpec(next);
        if (next) setStars(next.stars);
    }, []);

    const stage = useCallback((player: PlayerWithTeamInfo) => {
        if (target.category === "spec") {
            if (!spec) {
                nameRef.current?.focus();
                return false;
            }
            dispatch({type: "addSpec", tempId: crypto.randomUUID(), spec, stars, player});
            setSpec(null);
            setSpecQuery("");
            setStars(0);
        } else {
            if (!name.trim()) {
                nameRef.current?.focus();
                return false;
            }
            dispatch({type: "add", tempId: crypto.randomUUID(), target, awardName: name, player});
            setName("");
        }
        setPlayerQuery("");
        focusName();
        return true;
    }, [name, spec, stars, target, focusName]);

    const removeStaged = useCallback((tempId: string) => dispatch({type: "remove", tempId}), []);

    const save = useCallback(async () => {
        if (staged.length === 0 || saving) return;
        setSaving(true);
        const awardItems = staged.filter(isStagedAward);
        const specItems = staged.filter(isStagedSpec);
        const saved: string[] = [];
        let failed = 0;
        try {
            if (awardItems.length > 0) {
                const result = await batchUpsertSeasonAwardsAction({seasonId, awards: toBatchAwards(awardItems)});
                if (result.ok) {
                    onAwardsSaved(result.value);
                    saved.push(...awardItems.map(a => a.tempId));
                    setSuggestions(prev => {
                        const next = {...prev};
                        for (const a of [...awardItems].reverse()) {
                            const list = next[a.category];
                            if (!list) continue;
                            next[a.category] = [a.awardName, ...list.filter(n => n.toLowerCase() !== a.awardName.toLowerCase())];
                        }
                        return next;
                    });
                } else {
                    failed += awardItems.length;
                    toast.error("Failed to save awards", result.error.message);
                }
            }
            for (const item of specItems) {
                const result = await awardSpecWinnerAction({seasonId, specId: item.spec.id, playerId: item.player.id, starsAwarded: item.stars});
                if (result.ok) {
                    onSpecSaved(result.value);
                    saved.push(item.tempId);
                } else {
                    failed += 1;
                    clientLogger.error("useStagedAwards", "Spec winner save failed", {specId: item.spec.id, error: result.error});
                }
            }
        } catch (err) {
            clientLogger.error("useStagedAwards", "Save failed", {err});
            toast.error("Something went wrong");
        } finally {
            dispatch({type: "removeMany", tempIds: saved});
            if (saved.length > 0) toast.success(`${saved.length} saved`);
            if (failed > 0) toast.error(`${failed} not saved`, "They are still staged. Try saving again.");
            setSaving(false);
        }
    }, [staged, saving, seasonId, onAwardsSaved, onSpecSaved]);

    const startEdit = useCallback((award: SeasonAwardEntryWithPlayer) => {
        if (!isBarCategory(award.category)) return;
        setEditingSpecId(null);
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

    const startSpecEdit = useCallback((winner: SpecWinnerWithRefs) => {
        setEditingId(null);
        setEditingSpecId(winner.id);
        setTarget(prev => ({...prev, category: "spec"}));
        setSpec(null);
        setSpecQuery("");
        setPlayerQuery("");
        requestAnimationFrame(() => playerRef.current?.focus());
    }, []);

    const stopEdit = useCallback(() => {
        setEditingId(null);
        setEditingSpecId(null);
        setName("");
        setPlayerQuery("");
    }, []);

    const editing = editingId ? awards.find(a => a.id === editingId) ?? null : null;
    const editingSpec = editingSpecId ? specWinners.find(w => w.id === editingSpecId) ?? null : null;

    return {
        target,
        setTarget,
        arm,
        name,
        setName,
        spec,
        selectSpec,
        specQuery,
        setSpecQuery,
        stars,
        setStars,
        playerQuery,
        setPlayerQuery,
        staged,
        stage,
        removeStaged,
        save,
        saving,
        editing,
        startEdit,
        editingSpec,
        startSpecEdit,
        stopEdit,
        suggestions: target.category === "spec" ? [] : suggestions[target.category] ?? [],
        nameRef,
        playerRef,
    };
}

export type StagedAwardsState = ReturnType<typeof useStagedAwards>;
