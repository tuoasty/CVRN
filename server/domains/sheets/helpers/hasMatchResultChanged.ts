type ExistingSetLine = { set_number: number; home_score: number; away_score: number }
type NewSetLine = { setNumber: number; homeScore: number; awayScore: number }

export function hasMatchResultChanged(
    existingSets: ExistingSetLine[],
    existingIsForfeit: boolean,
    newSets: NewSetLine[],
    newIsForfeit: boolean,
): boolean {
    if (existingIsForfeit !== newIsForfeit) return true
    if (existingSets.length !== newSets.length) return true

    const sortedExisting = [...existingSets].sort((a, b) => a.set_number - b.set_number)
    const sortedNew = [...newSets].sort((a, b) => a.setNumber - b.setNumber)

    return sortedExisting.some((existing, i) => {
        const next = sortedNew[i]
        return existing.set_number !== next.setNumber
            || existing.home_score !== next.homeScore
            || existing.away_score !== next.awayScore
    })
}
