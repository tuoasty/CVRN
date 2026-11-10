"use client";

import type {StandingsTableModel} from "./model/types";
import {StandingsGrid, type StandingsLinkMode} from "./table/StandingsGrid";

function zoneLegend(model: StandingsTableModel): string | null {
    if (!model.qualifiedTeams) return null;
    const playin = model.playinTeams > 0 ? `, next ${model.playinTeams} to the play-in` : "";
    return `Top ${model.qualifiedTeams} go to the playoffs${playin}.`;
}

export function StandingsView({model, regionCode, seasonSlug}: {
    model: StandingsTableModel;
    regionCode: string;
    seasonSlug: string;
    linkMode: StandingsLinkMode;
}) {
    if (model.rows.length === 0) {
        return (
            <p className="py-16 text-center text-sm text-muted-foreground">
                No teams in this season yet. Teams appear here once the roster is set.
            </p>
        );
    }

    const legend = zoneLegend(model);
    return (
        <div>
            <StandingsGrid model={model} regionCode={regionCode} seasonSlug={seasonSlug} />
            {legend && <p className="mt-3 text-xs text-muted-foreground">{legend}</p>}
        </div>
    );
}
