"use client";

import {useEffect, useId, useState} from "react";
import {ChevronDown} from "lucide-react";
import {cn} from "@/lib/utils";
import {TooltipProvider} from "@/app/components/ui/tooltip";
import Collapse from "@/app/features/information/Collapse";
import type {StandingsTableModel} from "./model/types";
import {StandingsGrid, type StandingsLinkMode} from "./table/StandingsGrid";
import {FormChips} from "./table/FormChips";
import {NextFixtureCell} from "./table/NextFixtureCell";
import {StandingsFaq} from "./faq/StandingsFaq";
import {SPOTS_MAY_CHANGE} from "./faq/buildFaqItems";

function zoneLegend(model: StandingsTableModel): string | null {
    if (!model.qualifiedTeams) return null;
    const playin = model.playinTeams > 0 ? `, next ${model.playinTeams} to the play-in` : "";
    return `Top ${model.qualifiedTeams} go to the playoffs${playin}. ${SPOTS_MAY_CHANGE}`;
}

export function StandingsView({model, regionCode, seasonSlug, linkMode, header}: {
    model: StandingsTableModel;
    regionCode: string;
    seasonSlug: string;
    linkMode: StandingsLinkMode;
    header: React.ReactNode;
}) {
    const [faqOpen, setFaqOpen] = useState(false);
    const trayId = useId();

    useEffect(() => {
        if (!faqOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setFaqOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [faqOpen]);

    const legend = zoneLegend(model);

    return (
        <div>
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <div className="min-w-0">{header}</div>
                <button
                    type="button"
                    aria-expanded={faqOpen}
                    aria-controls={trayId}
                    onClick={() => setFaqOpen(o => !o)}
                    className={cn(
                        "inline-flex min-h-11 items-center gap-1 text-sm transition-colors duration-150 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none",
                        faqOpen ? "font-semibold text-foreground underline decoration-2 underline-offset-[6px]" : "font-medium text-muted-foreground",
                    )}
                >
                    How the table works
                    <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform duration-200 motion-reduce:transition-none", faqOpen && "rotate-180")} />
                </button>
            </div>

            <Collapse open={faqOpen}>
                <div id={trayId} className="mt-4 border-y border-border py-5">
                    <StandingsFaq model={model} />
                </div>
            </Collapse>

            <div className="mt-6">
                {model.rows.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">
                        No teams in this season yet. Teams appear here once the roster is set.
                    </p>
                ) : (
                    <>
                        <TooltipProvider delayDuration={100}>
                            <StandingsGrid
                                model={model}
                                regionCode={regionCode}
                                seasonSlug={seasonSlug}
                                renderForm={row => (
                                    <FormChips team={row.team} form={row.form} regionCode={regionCode} seasonSlug={seasonSlug} linkMode={linkMode} />
                                )}
                                renderNext={row => (
                                    <NextFixtureCell next={row.next} regionCode={regionCode} seasonSlug={seasonSlug} linkMode={linkMode} />
                                )}
                            />
                        </TooltipProvider>
                        {legend && <p className="mt-3 text-xs text-muted-foreground">{legend}</p>}
                    </>
                )}
            </div>
        </div>
    );
}
