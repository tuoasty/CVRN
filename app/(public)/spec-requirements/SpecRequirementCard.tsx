import {Fragment} from "react";
import {formatHeight} from "@/server/domains/spec/types";
import type {PublicSpec, PublicRequirement} from "@/server/domains/spec/types";
import {TIER_WORD} from "@/server/domains/spec/helpers/maskRequirement";

function Stars({n}: {n: number}) {
    return (
        <span className="mt-0.5 block text-sm tracking-[1px]">
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={i <= n ? "text-foreground" : "text-border"}>
                    ★
                </span>
            ))}
        </span>
    );
}

function Line({req}: {req: PublicRequirement}) {
    return (
        <div className="flex items-baseline justify-between gap-3 py-1 text-sm leading-tight">
            <span className="text-foreground">{req.label}</span>
            {req.tier !== null && (
                <span className="shrink-0 font-semibold text-foreground">{TIER_WORD[req.tier]}</span>
            )}
        </div>
    );
}

export default function SpecRequirementCard({spec, floor}: {spec: PublicSpec; floor: number}) {
    const heightRange = `${formatHeight(spec.heightInches - 2)} – ${formatHeight(spec.heightInches + 2)}`;
    const extraParticipation = spec.participation.filter(p => p.statKey !== "sets_played");

    return (
        <div className="panel flex min-h-[340px] flex-col">
            <div className="border-b border-border p-4">
                <div className="text-lg font-semibold leading-tight tracking-[-.015em]">{spec.name}</div>
                <Stars n={spec.stars} />
            </div>

            <div className="flex flex-1 flex-col p-4">
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-3 font-mono text-xs tabular-nums text-muted-foreground">
                    <span>
                        <b className="font-medium text-foreground">{floor}</b> sets played
                    </span>
                    <span className="text-border">·</span>
                    <span>
                        <b className="font-medium text-foreground">{heightRange}</b> height
                    </span>
                    {extraParticipation.map(p => (
                        <Fragment key={p.statKey}>
                            <span className="text-border">·</span>
                            <span>
                                <b className="font-medium text-foreground">{p.value}</b> {p.label}
                            </span>
                        </Fragment>
                    ))}
                </div>

                <div>
                    <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>Main</span>
                        <span>all required</span>
                    </div>
                    {spec.main.map(r => (
                        <Line key={r.statKey} req={r} />
                    ))}
                </div>

                {spec.secondary.length > 0 && (
                    <div className="mt-4">
                        <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <span>Secondary</span>
                            <span>
                                any {spec.secondaryRequired} of {spec.secondary.length}
                            </span>
                        </div>
                        {spec.secondary.map(r => (
                            <Line key={r.statKey} req={r} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
