type RoundType = "play_in" | "round_of_16" | "quarterfinal" | "semifinal" | "final" | "third_place";

export function calculateRounds(teamCount: number): Array<{ type: RoundType; matchCount: number }> {
    const rounds: Array<{ type: RoundType; matchCount: number }> = [];
    let remainingTeams = teamCount;

    const roundNames: RoundType[] = ["round_of_16", "quarterfinal", "semifinal", "final"];
    let roundNameIndex = 0;

    if (teamCount === 16) {
        roundNameIndex = 0;
    } else if (teamCount === 8) {
        roundNameIndex = 1;
    } else if (teamCount === 4) {
        roundNameIndex = 2;
    } else if (teamCount === 2) {
        roundNameIndex = 3;
    }

    while (remainingTeams > 1) {
        const matchCount = remainingTeams / 2;
        const roundType = roundNameIndex < roundNames.length ? roundNames[roundNameIndex] : "quarterfinal";

        rounds.push({
            type: roundType,
            matchCount
        });

        remainingTeams = matchCount;
        roundNameIndex++;
    }

    return rounds;
}
