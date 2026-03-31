// Re-export all hooks for ergonomic imports
export { useRegions, useRegionByCode } from './useRegions';
export { useSeasons, useSeasonBySlugAndRegion } from './useSeasons';
export { useTeams, useTeamWithPlayers, useTeamsByIds, mutateAllTeams, mutateTeamWithPlayers } from './useTeams';
export { useTeamPlayers, usePlayersByIds, mutateTeamPlayers } from './usePlayers';
export {
    useAllMatches,
    useAvailableTeams,
    useMatchesForWeek,

    useWeekSchedule,
    usePlayoffSchedule,
    useAvailablePlayoffRounds,
    useUpcomingMatches,
    useRecentMatches,
    updateMatchSchedule,
    completeMatch,
    voidMatch,
    updateMatchResults,
    deleteMatch,
    invalidateMatchCaches,
} from './useMatches';
export { useStandings } from './useStandings';
export { usePlayoffBrackets, generateBracket, resetBrackets } from './usePlayoffs';
export {
    useOfficials,
    useMatchOfficials,
    searchOfficials,
    saveOfficial,
    fetchMatchOfficialsByType,
    assignOfficialToMatch,
    assignMultipleOfficials,
    removeOfficialFromMatch,
    removeAllOfficialsOfType,
} from './useOfficials';
