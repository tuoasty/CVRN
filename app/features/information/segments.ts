export type InformationSegmentKey = 'abilities' | 'builds' | 'updates' | 'specs'

export const INFORMATION_SEGMENTS: readonly { key: InformationSegmentKey; label: string; href: string }[] = [
    { key: 'abilities', label: 'Abilities', href: '/information/abilities' },
    { key: 'builds', label: 'Builds', href: '/information/builds' },
    { key: 'updates', label: 'Updates', href: '/information/updates' },
    { key: 'specs', label: 'Specs', href: '/information/specs' },
]

export function activeSegment(pathname: string): InformationSegmentKey {
    const match = INFORMATION_SEGMENTS.find(s => pathname === s.href || pathname.startsWith(`${s.href}/`))
    return match?.key ?? 'abilities'
}
