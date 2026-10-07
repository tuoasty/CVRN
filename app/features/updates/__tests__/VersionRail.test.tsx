import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import VersionRail from '../VersionRail'
import { neighborsOf } from '@/server/domains/updateLog/helpers/neighborsOf'

const index = Array.from({ length: 15 }, (_, i) => ({
    version: `1.${14 - i}`,
    title: i === 0 ? 'Latest patch' : null,
    released_at: '2026-10-01',
}))

function render(current: string): string {
    const { newer, older } = neighborsOf(index, current)
    return renderToStaticMarkup(<VersionRail index={index} current={current} newer={newer} older={older} />)
}

function listedVersions(html: string): string[] {
    return [...html.matchAll(/<a ([^>]*)>/g)]
        .map(m => m[1])
        .filter(attrs => attrs.includes('class="group'))
        .map(attrs => decodeURIComponent(/href="\/updates\/([^"]+)"/.exec(attrs)![1]))
}

describe('VersionRail', () => {
    it('lists nine versions centered on the current one', () => {
        const html = render('1.5')
        expect(listedVersions(html)).toEqual(['1.9', '1.8', '1.7', '1.6', '1.5', '1.4', '1.3', '1.2', '1.1'])
        const current = [...html.matchAll(/<a ([^>]*)>/g)].map(m => m[1]).filter(a => a.includes('aria-current="page"'))
        expect(current).toHaveLength(1)
        expect(current[0]).toContain('href="/updates/1.5"')
    })

    it('links the arrows to the neighbouring versions and counts what is hidden', () => {
        const html = render('1.5')
        expect(html).toContain('aria-label="Newer version 1.6"')
        expect(html).toContain('aria-label="Older version 1.4"')
        expect(html).toContain('+5')
        expect(html).toContain('+1')
    })

    it('disables the newer arrow on the latest version', () => {
        const html = render('1.14')
        expect(listedVersions(html)[0]).toBe('1.14')
        expect(html).not.toContain('aria-label="Newer version')
        expect(html).toContain('aria-disabled')
    })

    it('disables the older arrow on the oldest version', () => {
        const html = render('1.0')
        expect(listedVersions(html).at(-1)).toBe('1.0')
        expect(html).not.toContain('aria-label="Older version')
    })
})
