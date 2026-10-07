import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import VersionDots from '../VersionDots'
import { neighborsOf } from '@/server/domains/updateLog/helpers/neighborsOf'

const index = Array.from({ length: 15 }, (_, i) => ({
    version: `1.${14 - i}`,
    title: null,
    released_at: '2026-10-01',
}))

function render(current: string): string {
    const { newer, older } = neighborsOf(index, current)
    return renderToStaticMarkup(<VersionDots index={index} current={current} newer={newer} older={older} />)
}

function dotVersions(html: string): string[] {
    return [...html.matchAll(/aria-label="Version ([^"]+)"/g)].map(m => m[1])
}

describe('VersionDots', () => {
    it('shows nine dots newest first, centered on the current version', () => {
        const html = render('1.5')
        expect(dotVersions(html)).toEqual(['1.9', '1.8', '1.7', '1.6', '1.5', '1.4', '1.3', '1.2', '1.1'])
        expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    })

    it('puts newer before older in the markup so newer sits on the left', () => {
        const html = render('1.5')
        expect(html.indexOf('Newer version 1.6')).toBeLessThan(html.indexOf('Older version 1.4'))
    })

    it('disables the arrow at each end', () => {
        expect(render('1.14')).not.toContain('aria-label="Newer version')
        expect(render('1.0')).not.toContain('aria-label="Older version')
    })
})
