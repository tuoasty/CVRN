"use client";

import {useEffect, useMemo, useState, type FormEvent} from "react";
import {Button} from "@/app/components/ui/button";
import {Input} from "@/app/components/ui/input";
import {Label} from "@/app/components/ui/label";
import {PickemSettingsSchema} from "@/server/domains/pickem/types/schemas";
import type {PickemSettings, PickemSettingsInput} from "@/server/domains/pickem";

type FieldKey = keyof PickemSettingsInput;
type Draft = Record<FieldKey, string>;

type Field = {key: FieldKey; label: string; step: string; hint: string};

const GROUPS: {title: string; note: string; fields: Field[]}[] = [
    {
        title: "Stakes",
        note: "Checked on every pick, so a change applies to open markets at once. A player already above a new maximum keeps their stake but cannot raise it.",
        fields: [
            {key: "stakeMin", label: "Minimum stake", step: "1", hint: "Smallest total a player can put on one market."},
            {key: "stakeMax", label: "Maximum stake", step: "1", hint: "Largest total a player can put on one market. Keep it at most half the seed so one player cannot swing a pool."},
        ],
    },
    {
        title: "Odds",
        note: "Apply to matches published after saving. Markets already published keep the values they were published with.",
        fields: [
            {key: "seed", label: "Seed", step: "1", hint: "House currency put into each market, split by starting chance. Keep it at least twice the maximum stake."},
            {key: "rake", label: "Rake", step: "0.001", hint: "Share of every pool that is burned. 0.05 is 5%."},
            {key: "oddsFloor", label: "Odds floor", step: "0.01", hint: "Lowest odds a winning pick can pay. At 1.00 a winning pick never pays less than its stake."},
            {key: "sigma", label: "Sigma", step: "0.01", hint: "Spread of set point margins around the ratings. Higher opens odds closer to even. Calibrated at 5.23 on 2026-11-25."},
            {key: "shrinkSets", label: "Shrinkage sets", step: "0.5", hint: "A team's rating counts at half weight after this many sets and nears full weight as it plays more."},
            {key: "probClamp", label: "Chance clamp", step: "0.001", hint: "No outcome opens below this chance, and none above 1 minus it. 0.03 is 3%."},
        ],
    },
];

const FIELDS: Field[] = GROUPS.flatMap(g => g.fields);

function toDraft(settings: PickemSettings): Draft {
    return {
        stakeMin: String(settings.stakeMin),
        stakeMax: String(settings.stakeMax),
        seed: String(settings.seed),
        rake: String(settings.rake),
        oddsFloor: settings.oddsFloor.toFixed(2),
        sigma: String(settings.sigma),
        shrinkSets: String(settings.shrinkSets),
        probClamp: String(settings.probClamp),
    };
}

function toInput(draft: Draft): Record<FieldKey, number> {
    return Object.fromEntries(FIELDS.map(f => [f.key, draft[f.key].trim() === "" ? Number.NaN : Number(draft[f.key])])) as Record<FieldKey, number>;
}

export function PickemSettingsForm({settings, onSave}: {
    settings: PickemSettings;
    onSave: (input: PickemSettingsInput) => Promise<boolean>;
}) {
    const saved = useMemo(() => toDraft(settings), [settings]);
    const [draft, setDraft] = useState<Draft>(saved);
    const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setDraft(saved);
        setErrors({});
    }, [saved]);

    const dirty = FIELDS.some(f => draft[f.key] !== saved[f.key]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const parsed = PickemSettingsSchema.safeParse(toInput(draft));
        if (!parsed.success) {
            const next: Partial<Record<FieldKey, string>> = {};
            for (const issue of parsed.error.issues) {
                const key = issue.path[0] as FieldKey;
                next[key] ??= Number.isNaN(toInput(draft)[key]) ? "Enter a number" : issue.message;
            }
            setErrors(next);
            return;
        }
        setErrors({});
        setSaving(true);
        try {
            await onSave(parsed.data);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="max-w-3xl">
            {GROUPS.map((group, index) => (
                <section key={group.title} aria-labelledby={`pickem-settings-${group.title}`} className={index > 0 ? "mt-11" : undefined}>
                    <h2 id={`pickem-settings-${group.title}`} className="border-b border-border pb-2 text-sm font-semibold text-foreground">{group.title}</h2>
                    <p className="mt-3 max-w-prose text-sm text-muted-foreground">{group.note}</p>
                    <div className="mt-6 grid gap-x-10 gap-y-7 md:grid-cols-2">
                        {group.fields.map(field => {
                            const id = `pickem-setting-${field.key}`;
                            const error = errors[field.key];
                            return (
                                <div key={field.key}>
                                    <Label htmlFor={id} className="text-sm font-semibold text-foreground">{field.label}</Label>
                                    <Input
                                        id={id}
                                        type="number"
                                        inputMode={field.step === "1" ? "numeric" : "decimal"}
                                        step={field.step}
                                        value={draft[field.key]}
                                        onChange={e => setDraft(d => ({...d, [field.key]: e.target.value}))}
                                        aria-invalid={error ? true : undefined}
                                        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
                                        className="mt-2 h-11 w-40 rounded-sm font-mono tabular-nums md:h-9"
                                    />
                                    {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive">{error}</p>}
                                    <p id={`${id}-hint`} className="mt-1.5 max-w-sm text-sm text-muted-foreground">{field.hint}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}

            <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button type="submit" className="h-11 rounded-sm md:h-9" disabled={!dirty || saving}>
                    {saving ? "Saving..." : "Save settings"}
                </Button>
                {dirty && (
                    <Button type="button" variant="ghost" className="h-11 rounded-sm md:h-9" disabled={saving} onClick={() => { setDraft(saved); setErrors({}); }}>
                        Discard changes
                    </Button>
                )}
                <span className="text-sm text-muted-foreground">
                    Last saved {new Date(settings.updatedAt).toLocaleString("en-GB", {dateStyle: "medium", timeStyle: "short"})}
                </span>
            </div>
        </form>
    );
}
