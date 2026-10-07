export function formatReleased(date: string): string {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
        timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric',
    })
}
