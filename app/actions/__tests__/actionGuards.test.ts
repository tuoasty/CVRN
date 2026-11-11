import {describe, expect, it} from "vitest";
import {readdirSync, readFileSync} from "node:fs";
import {join} from "node:path";

const ACTIONS_DIR = join(process.cwd(), "app", "actions");

const PUBLIC_ACTIONS = new Set([
    "getAvailableTeamsForWeekAction",
    "getAllMatchesAction",
    "getMatchesForWeekAction",
    "getWeekScheduleAction",
    "getPlayoffScheduleAction",
    "getSeasonPlayoffScheduleAction",
    "getAvailablePlayoffRoundsAction",
    "getCompletedPlayoffRoundsAction",
    "getUpcomingMatchesAction",
    "getMatchDetailAction",
    "getMatchDetailByIdAction",
    "getDefaultWeekForSeasonAction",
    "getPlayoffRoundCountsAction",
    "getWeekMatchCountsAction",
    "getRecentMatchesAction",
    "searchOfficialsByNameAction",
    "getMatchOfficialsAction",
    "getMatchOfficialsByTypeAction",
    "searchOfficialsInDatabaseAction",
    "getOfficialByExactUsernameAction",
    "getSeasonPlayoffMatchesAction",
    "getAllMediaPostsAction",
    "getPagedMediaPostsAction",
    "getRecentMediaPostsAction",
    "getPublishedArticlesAction",
    "getArticleBySlugAction",
    "getAllTeamsAction",
    "getAllTeamsWithRegionsAction",
    "getTeamByNameAndSeasonAction",
    "getTeamWithPlayersAction",
    "getTeamsByIdsAction",
    "getTeamNameHistoryAction",
    "getTeamsBySeasonAction",
    "searchPlayersAction",
    "getTeamPlayersAction",
    "getPlayersByIdsAction",
    "searchPlayersInDatabaseAction",
    "searchPlayersForPublicAction",
    "getRecentPlayersForPublicAction",
    "getPlayerByExactUsernameAction",
    "getPlayerDetailAction",
    "getAllSeasonsAction",
    "getSeasonByIdAction",
    "getSeasonBySlugAndRegionAction",
    "getSeasonPodiumAction",
    "getSeasonAwardsAction",
    "getSeasonHistoryDetailAction",
    "getSeasonAllStarTeamsAction",
    "getPlayoffBracketBySeasonIdAction",
    "getAllPlayoffConfigsAction",
    "getRangedSeasonLeaderboardAction",
    "getAllRegionsAction",
    "getStandingsAction",
]);

const BANNED = ["requireAdmin(", "requireRoles(", "requireSuperAdmin(", "getUserRole(", "function requireAuth"];

type ActionSource = { file: string; name: string; body: string };

function readActions(): { files: { file: string; source: string }[]; actions: ActionSource[] } {
    const files = readdirSync(ACTIONS_DIR)
        .filter(file => file.endsWith(".actions.ts") && file !== "auth.actions.ts")
        .map(file => ({ file, source: readFileSync(join(ACTIONS_DIR, file), "utf8") }));

    const actions = files.flatMap(({ file, source }) => {
        const starts = [...source.matchAll(/^export async function (\w+)/gm)];
        return starts.map((match, i) => ({
            file,
            name: match[1],
            body: source.slice(match.index, starts[i + 1]?.index ?? source.length),
        }));
    });

    return { files, actions };
}

describe("server action guards", () => {
    const { files, actions } = readActions();

    it("finds the action files", () => {
        expect(actions.length).toBeGreaterThan(100);
    });

    it("guards every non-public action with requireGroups", () => {
        const unguarded = actions
            .filter(action => !PUBLIC_ACTIONS.has(action.name) && !action.body.includes("requireGroups("))
            .map(action => `${action.file}: ${action.name}`);
        expect(unguarded).toEqual([]);
    });

    it("keeps public actions free of a guard", () => {
        const guardedPublic = actions
            .filter(action => PUBLIC_ACTIONS.has(action.name) && action.body.includes("requireGroups("))
            .map(action => action.name);
        expect(guardedPublic).toEqual([]);
    });

    it("lists only actions that exist as public", () => {
        const names = new Set(actions.map(action => action.name));
        expect([...PUBLIC_ACTIONS].filter(name => !names.has(name))).toEqual([]);
    });

    it("uses no legacy role guard", () => {
        const offenders = files.flatMap(({ file, source }) =>
            BANNED.filter(token => source.includes(token)).map(token => `${file}: ${token}`));
        expect(offenders).toEqual([]);
    });
});
