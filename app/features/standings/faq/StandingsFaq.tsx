import type {StandingsTableModel} from "../model/types";
import {buildFaqItems} from "./buildFaqItems";

export function StandingsFaq({model}: {model: StandingsTableModel}) {
    const items = buildFaqItems(model);
    return (
        <dl className="grid gap-x-10 gap-y-5 md:grid-cols-2">
            {items.map(item => (
                <div key={item.question}>
                    <dt className="text-sm font-semibold">{item.question}</dt>
                    <dd className="mt-1 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
                </div>
            ))}
        </dl>
    );
}
