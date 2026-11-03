import {RuledSection, CareerLink} from "./RuledSection";
import type {PlayerHonour} from "./playerHonours";

export function HonoursSection({honours, careerHref}: {honours: PlayerHonour[]; careerHref: string | null}) {
    return (
        <RuledSection title="Honours" action={careerHref ? <CareerLink href={careerHref}>Career</CareerLink> : undefined}>
            <ul>
                {honours.map(honour => (
                    <li key={honour.label} className="flex items-baseline gap-3 border-b border-border/60 py-2 text-sm last:border-b-0">
                        <span className="w-8 shrink-0 font-mono font-semibold tabular-nums">{honour.count}x</span>
                        <span className="min-w-0">{honour.label}</span>
                    </li>
                ))}
            </ul>
        </RuledSection>
    );
}
