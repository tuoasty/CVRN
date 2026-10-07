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

    it('turns > before any heading level into a collapsible', () => {
        const html = render('> # Features\nintro\n\n> ## Serving\nserve text\n\n> #### Detail\ndetail text')
        expect(html.match(/<details/g)).toHaveLength(3)
        expect(between(html, '<details id="features"', '</details>')).toMatch(/<summary[^>]*>.*<h1[^>]*>Features<\/h1>/)
        expect(between(html, '<details id="serving"', '</details>')).toContain('serve text')
        expect(between(html, '<details id="detail"', '</details>')).toContain('detail text')
    })

    it('keeps a > line without a heading as a regular blockquote', () => {
        const html = render('> Nation VFX\nBuy a region effect pack')
        expect(html).not.toContain('<details')
        expect(html).toContain('<blockquote')
    })

    it('only treats > at the very start of a line as a toggle', () => {
        const html = render('  > ### Indented\nbody')
        expect(html).not.toContain('<details')
        expect(html).toContain('<blockquote')
    })

    it('ends a collapsible at the first empty line', () => {
        const html = render('> ### A\ninside\n- also inside\n\noutside')
        const toggle = between(html, '<details', '</details>')
        expect(toggle).toContain('also inside')
        expect(toggle).not.toContain('outside')
        expect(html.indexOf('</details>')).toBeLessThan(html.indexOf('outside'))
    })

    it('splits features written with > on every line into separate toggles', () => {
        const html = render('> ### A\n> body a\n> ### B\n> body b')
        expect(html.match(/<details/g)).toHaveLength(2)
        expect(between(html, '<details id="a"', '</details>')).toContain('body a')
        expect(between(html, '<details id="a"', '</details>')).not.toContain('body b')
        expect(between(html, '<details id="b"', '</details>')).toContain('body b')
    })

    it('ends a collapsible at an empty line between list items', () => {
        const html = render('> ### A\n- hidden\n\n- visible')
        const toggle = between(html, '<details', '</details>')
        expect(toggle).toContain('hidden')
        expect(toggle).not.toContain('visible')
        expect(html.indexOf('</details>')).toBeLessThan(html.indexOf('visible'))
        expect(html).not.toMatch(/<p[^>]*>hidden/)
        expect(html).not.toMatch(/<p[^>]*>visible/)
    })

    it('continues numbering when an ordered list is split by the toggle end', () => {
        const html = render('> ### A\n1. one\n\n2. two')
        expect(between(html, '<details', '</details>')).toContain('one')
        expect(html).toMatch(/<\/details>\s*<ol[^>]*start="2"/)
    })

    it('stops a collapsible at the next heading without an empty line', () => {
        const html = render('> ### A\nbody\n## Next')
        expect(between(html, '<details', '</details>')).not.toContain('Next')
        expect(html).toMatch(/<h2[^>]*id="next"/)
    })

    it('keeps empty lines inside a fenced code block within the collapsible', () => {
        const toggle = between(render('> ### A\n```\ncode\n\nmore\n```\nafter'), '<details', '</details>')
        expect(toggle).toContain('more')
        expect(toggle).toContain('after')
    })

    it('ignores > headings inside a fenced code block', () => {
        const html = render('```\n> ### Not a toggle\nx\n```')
        expect(html).not.toContain('<details')
        expect(html).toContain('&gt; ### Not a toggle')
    })

    it('handles CRLF bodies', () => {
        const html = render('> ### A\r\ninside\r\n\r\noutside')
        expect(between(html, '<details', '</details>')).toContain('inside')
        expect(between(html, '<details', '</details>')).not.toContain('outside')
    })

    it('closes a collapsible at the end of the document', () => {
        const toggle = between(render('intro\n> ### End\nlast line'), '<details', '</details>')
        expect(toggle).toContain('last line')
    })

    it('renders a > heading with nothing under it as a plain heading', () => {
        const html = render('> ### Lonely\n\nnext')
        expect(html).not.toContain('<details')
        expect(html).not.toContain('<blockquote')
        expect(html).toMatch(/<h3[^>]*id="lonely"/)
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
        expect(html).toContain('aria-label="Buff"')
        expect(html).toContain('Jump 12 → 14')
        expect(html).not.toContain('[buff]')
    })

    it('marks a nested [nerf] list item', () => {
        const html = render('- Serving\n  - [nerf] Spike CD 8s → 10s')
        expect(html).toContain('data-delta="nerf"')
        expect(html).toContain('aria-label="Nerf"')
        expect(html).not.toContain('[nerf]')
    })

    it('marks a plain paragraph that starts with a marker', () => {
        const html = render('[buff] Jump 12 → 14')
        expect(html).toContain('data-delta="buff"')
        expect(html).toContain('Jump 12 → 14')
        expect(html).not.toContain('[buff]')
    })

    it('marks every line that starts with a marker inside one paragraph', () => {
        const html = render('Changes\n[buff] Jump 12 → 14\n[nerf] Spike CD 8s → 10s')
        expect(html.match(/data-delta="buff"/g)).toHaveLength(1)
        expect(html.match(/data-delta="nerf"/g)).toHaveLength(1)
        expect(html).not.toContain('[buff]')
        expect(html).not.toContain('[nerf]')
    })

    it('marks a heading and keeps the marker out of its anchor', () => {
        const html = render('### [nerf] Speed Surge')
        expect(html).toMatch(/<h3[^>]*id="speed-surge"[^>]*>.*data-delta="nerf"/)
        expect(html).not.toContain('[nerf]')
    })

    it('marks a collapsible title', () => {
        const html = render('> ### [buff] Relentless\nbody')
        expect(between(html, '<summary', '</summary>')).toContain('data-delta="buff"')
        expect(html).toContain('id="relentless"')
    })

    it('accepts markers in any letter case', () => {
        expect(render('- [BUFF] Jump')).toContain('data-delta="buff"')
    })

    it('marks items inside a collapsible', () => {
        const toggle = between(render('> ### Jump serve\n- [buff] Height 12 → 14'), '<details', '</details>')
        expect(toggle).toContain('data-delta="buff"')
    })

    it('leaves unknown bracket tags alone', () => {
        const html = render('- [revamp] Serve system')
        expect(html).toContain('[revamp]')
        expect(html).not.toContain('data-delta')
    })

    it('only treats a marker at the start of a line as a marker', () => {
        const html = render('Jump [buff] later')
        expect(html).toContain('[buff]')
        expect(html).not.toContain('data-delta')
    })

    it('marks a [rework] line and removes the token', () => {
        const html = render('- [rework] Serve system rebuilt')
        expect(html).toContain('data-delta="rework"')
        expect(html).toContain('aria-label="Rework"')
        expect(html).not.toContain('[rework]')
    })

    it('puts a list marker in place of the bullet', () => {
        const html = render('- [buff] Jump 12 → 14\n- Unchanged')
        expect(html).toMatch(/<li data-marker="buff"[^>]*>\s*<span data-delta="buff"/)
        expect(html).toMatch(/<li class="pl-1">Unchanged<\/li>/)
    })

    it('hoists the marker out of the paragraph in a loose list', () => {
        const html = render('- [nerf] Spike CD 8s → 10s\n\n- Other')
        expect(html).toMatch(/<li data-marker="nerf"[^>]*>\s*<span data-delta="nerf"[^>]*>.*?<\/span>\s*<p/s)
    })

    it('keeps a marker inline outside lists', () => {
        const html = render('[rework] Serve system rebuilt')
        expect(html).toMatch(/<p[^>]*><span data-delta="rework"/)
        expect(html).not.toContain('data-marker')
    })

    it('only hoists a marker that starts the item', () => {
        const html = render('- Jump\n[buff] Height')
        expect(html).toContain('data-delta="buff"')
        expect(html).not.toContain('data-marker')
    })
})

describe('remarkChangelog NEW tag', () => {
    it('turns [new] at the start of a line into a NEW label', () => {
        const html = render('[new] Float serve is back')
        expect(html).toContain('<span data-tag="new" class="mr-[0.35em] font-semibold text-primary">NEW</span>Float serve is back')
        expect(html).not.toContain('[new]')
    })

    it('accepts any letter case', () => {
        expect(render('[NEW] Float serve')).toContain('data-tag="new"')
    })

    it('leaves [new] in the middle of a line literal', () => {
        const html = render('Float serve [new] is back')
        expect(html).toContain('[new]')
        expect(html).not.toContain('data-tag')
    })

    it('labels a feature heading and keeps NEW out of its anchor', () => {
        const html = render('### [new] Float serve')
        expect(html).toMatch(/<h3[^>]*id="float-serve"[^>]*><span data-tag="new"/)
    })

    it('labels a collapsible title', () => {
        const summary = between(render('> ### [new] Power meter\nbody'), '<summary', '</summary>')
        expect(summary).toContain('data-tag="new"')
    })

    it('keeps the bullet on a NEW list item', () => {
        const html = render('- [new] Toss height setting')
        expect(html).toContain('data-tag="new"')
        expect(html).not.toContain('data-marker')
    })

    it('combines with a marker in either order, hoisting only the marker', () => {
        for (const body of ['- [buff] [new] Jump', '- [new] [buff] Jump']) {
            const html = render(body)
            expect(html).toMatch(/<li data-marker="buff"[^>]*>\s*<span data-delta="buff"/)
            expect(html).toContain('<span data-tag="new"')
            expect(html).not.toMatch(/\[(new|buff)\]/i)
        }
    })
})

describe('remarkChangelog images', () => {
    const images = [
        { name: 'new-map', url: 'https://cdn.example/map.webp', caption: 'The new map' },
        { name: 'serve', url: 'https://cdn.example/serve.webp', caption: null },
    ]
    const renderWith = (body: string) => renderToStaticMarkup(<ChangelogBody body={body} images={images} />)

    it('renders a token on its own line as a figure with its caption as alt text', () => {
        const html = renderWith('[image:new-map]')
        expect(html).toContain('<figure')
        expect(html).toContain('src="https://cdn.example/map.webp"')
        expect(html).toContain('alt="The new map"')
        expect(html).toContain('<figcaption')
        expect(html).not.toContain('[image:')
    })

    it('floats an image with placement and width modifiers', () => {
        const html = renderWith('[image:serve:left:25]')
        expect(between(html, '<figure', '>')).toContain('float-left')
        expect(between(html, '<figure', '>')).toContain('w-1/4')
        expect(html).not.toContain('<figcaption')
    })

    it('renders nothing for a name with no attached image', () => {
        const html = renderWith('before\n\n[image:missing]\n\nafter')
        expect(html).not.toContain('<figure')
        expect(html).not.toContain('[image:missing]')
    })

    it('leaves a token in the middle of a sentence as text', () => {
        const html = renderWith('see [image:new-map] here')
        expect(html).not.toContain('<figure')
        expect(html).toContain('see [image:new-map] here')
    })

    it('splits a paragraph around a token line and keeps the order', () => {
        const html = renderWith('before\n[image:serve]\nafter')
        expect(html.indexOf('before')).toBeLessThan(html.indexOf('<figure'))
        expect(html.indexOf('</figure>')).toBeLessThan(html.indexOf('after'))
        expect(html).not.toMatch(/<p[^>]*>before<br/)
    })

    it('renders a token inside a list item', () => {
        const html = renderWith('- Serve rework\n  [image:serve]')
        expect(between(html, '<li', '</li>')).toContain('<figure')
    })

    it('keeps an image inside a collapsible and still ends it at the empty line', () => {
        const html = renderWith('> ### A\ntext\n[image:serve]\n\noutside')
        const toggle = between(html, '<details', '</details>')
        expect(toggle).toContain('<figure')
        expect(toggle).not.toContain('outside')
    })

    it('ignores the image source from markdown and only uses attached urls', () => {
        const html = renderWith('[image:serve]')
        expect(html.match(/src="/g)).toHaveLength(1)
        expect(html).not.toContain('data-image')
    })
})
