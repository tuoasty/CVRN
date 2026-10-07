import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ChangelogBody from '../ChangelogBody'

function render(body: string): string {
    return renderToStaticMarkup(<ChangelogBody body={body} />)
}

function between(html: string, start: string, end: string): string {
    const i = html.indexOf(start)
    const j = html.indexOf(end, i + start.length)
    if (i === -1 || j === -1) return ''
    return html.slice(i, j)
}

describe('remarkChangelog features and toggles', () => {
    it('renders a ### feature as a visible heading, not a collapsible', () => {
        const html = render('# Traits\n## New Traits\n### Speed Surge\nActivate for 8 seconds')
        expect(html).not.toContain('<details')
        expect(html).toMatch(/<h3[^>]*id="speed-surge"/)
        expect(html).toContain('Activate for 8 seconds')
    })

    it('turns > ### into a closed collapsible with the heading as its title', () => {
        const html = render('> ### Speed Surge\nActivate for 8 seconds\n- 60 second cooldown')
        const toggle = between(html, '<details', '</details>')
        expect(toggle).toContain('id="speed-surge"')
        expect(toggle).not.toMatch(/\sopen/)
        expect(between(toggle, '<summary', '</summary>')).toMatch(/<h3[^>]*>Speed Surge<\/h3>/)
        expect(toggle).toContain('Activate for 8 seconds')
        expect(toggle).toContain('60 second cooldown')
    })

    it('does not repeat the toggle id on the heading inside it', () => {
        const html = render('> ### Speed Surge\nbody')
        expect(html.match(/id="speed-surge"/g)).toHaveLength(1)
    })

    it('turns a plain > line into a collapsible titled by that line', () => {
        const toggle = between(render('> Nation VFX\nBuy a region effect pack'), '<details', '</details>')
        const summary = between(toggle, '<summary', '</summary>')
        expect(summary).toContain('Nation VFX')
        expect(summary).not.toContain('Buy a region')
        expect(toggle).toContain('Buy a region effect pack')
    })

    it('ends a collapsible at the first empty line', () => {
        const html = render('> ### A\ninside\n- also inside\n\noutside')
        const toggle = between(html, '<details', '</details>')
        expect(toggle).toContain('also inside')
        expect(toggle).not.toContain('outside')
        expect(html.indexOf('</details>')).toBeLessThan(html.indexOf('outside'))
    })

    it('treats consecutive > lines as one title plus body', () => {
        const toggle = between(render('> Title\n> more detail\nand this'), '<details', '</details>')
        expect(between(toggle, '<summary', '</summary>')).not.toContain('more detail')
        expect(toggle).toContain('more detail')
        expect(toggle).toContain('and this')
    })

    it('renders a > heading with nothing under it as a plain heading', () => {
        const html = render('> ### Lonely\n\nnext')
        expect(html).not.toContain('<details')
        expect(html).not.toContain('<blockquote')
        expect(html).toMatch(/<h3[^>]*id="lonely"/)
    })

    it('renders a > line with nothing under it as a plain line', () => {
        const html = render('> Just a note\n\nnext')
        expect(html).not.toContain('<details')
        expect(html).not.toContain('<blockquote')
        expect(html).toContain('Just a note')
    })

    it('renders separate collapsibles for features split by empty lines', () => {
        const html = render('> ### A\na\n\n> ### B\nb')
        expect(html.match(/<details/g)).toHaveLength(2)
    })

    it('leaves overview text before the first heading untouched', () => {
        const html = render('Big patch today.\n# Features\n> ### A\na text')
        expect(html.indexOf('Big patch today.')).toBeLessThan(html.indexOf('<h1'))
        expect(between(html, '<details', '</details>')).not.toContain('Big patch today.')
    })
})

describe('remarkChangelog heading ids', () => {
    it('gives # sections and ## categories slug ids', () => {
        const html = render('# Bug Fixes\n## Serving')
        expect(html).toMatch(/<h1[^>]*id="bug-fixes"/)
        expect(html).toMatch(/<h2[^>]*id="serving"/)
    })

    it('suffixes repeated headings across plain and collapsible features', () => {
        const html = render('## Serving\n## Serving\n### Fix\n> ### Fix\nbody')
        expect(html).toContain('id="serving"')
        expect(html).toContain('id="serving-2"')
        expect(html).toContain('id="fix"')
        expect(html).toContain('id="fix-2"')
    })

    it('ignores formatting and punctuation in slugs', () => {
        const html = render('### **Jump** serve!\nx')
        expect(html).toContain('id="jump-serve"')
    })

    it('keeps non-latin letters in slugs', () => {
        const html = render('## サーブ')
        expect(html).toContain('id="サーブ"')
    })

    it('falls back to a generic id when a heading has no letters or numbers', () => {
        const html = render('## !!!')
        expect(html).toContain('id="section"')
    })

    it('does not prefix ids, so hash links match', () => {
        const html = render('# Features')
        expect(html).not.toContain('user-content-')
    })
})

describe('remarkChangelog balance markers', () => {
    it('marks a [buff] list item and removes the token', () => {
        const html = render('- [buff] Jump 12 → 14')
        expect(html).toContain('data-delta="buff"')
        expect(html).toContain('Jump 12 → 14')
        expect(html).not.toContain('[buff]')
        expect(html).toContain('▲')
    })

    it('marks a nested [nerf] list item', () => {
        const html = render('- Serving\n  - [nerf] Spike CD 8s → 10s')
        expect(html).toContain('data-delta="nerf"')
        expect(html).not.toContain('[nerf]')
        expect(html).toContain('▼')
    })

    it('accepts markers in any letter case', () => {
        expect(render('- [BUFF] Jump')).toContain('data-delta="buff"')
    })

    it('marks items inside a collapsible', () => {
        const toggle = between(render('> ### Jump serve\n- [buff] Height 12 → 14'), '<details', '</details>')
        expect(toggle).toContain('data-delta="buff"')
    })

    it('leaves unknown bracket tags alone', () => {
        const html = render('- [rework] Serve system')
        expect(html).toContain('[rework]')
        expect(html).not.toContain('data-delta')
    })

    it('only treats a marker at the start of the item as a marker', () => {
        const html = render('- Jump [buff] later')
        expect(html).toContain('[buff]')
        expect(html).not.toContain('data-delta')
    })
})
