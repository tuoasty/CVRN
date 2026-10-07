import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ChangelogBody from '../ChangelogBody'
import { extractToc } from '../extractToc'

describe('extractToc', () => {
    it('lists # sections and ## categories in order with their depth', () => {
        const toc = extractToc('# Features\n## Serving\n### Jump serve\nx\n## Blocking\n# Bug Fixes')
        expect(toc.entries).toEqual([
            { id: 'features', text: 'Features', depth: 1 },
            { id: 'serving', text: 'Serving', depth: 2 },
            { id: 'blocking', text: 'Blocking', depth: 2 },
            { id: 'bug-fixes', text: 'Bug Fixes', depth: 1 },
        ])
    })

    it('leaves ### features out', () => {
        const toc = extractToc('# Features\n### Speed Surge\nx')
        expect(toc.entries.map(e => e.id)).toEqual(['features'])
    })

    it('detects an overview before the first section', () => {
        expect(extractToc('Big patch today.\n# Features').overview).toBe(true)
        expect(extractToc('# Features\nBig patch today.').overview).toBe(false)
    })

    it('counts a ### feature before the first section as overview', () => {
        expect(extractToc('### Teaser\nx\n\n# Features').overview).toBe(true)
    })

    it('keeps NEW labels and markers out of entry text', () => {
        const toc = extractToc('# [new] Odyssey\n## [rework] Serving')
        expect(toc.entries).toEqual([
            { id: 'odyssey', text: 'Odyssey', depth: 1 },
            { id: 'serving', text: 'Serving', depth: 2 },
        ])
    })

    it('treats a ## before any # as a top entry, not overview', () => {
        const toc = extractToc('## Serving\nx\n# Features')
        expect(toc.overview).toBe(false)
        expect(toc.entries[0]).toEqual({ id: 'serving', text: 'Serving', depth: 2 })
    })

    it('includes collapsible sections and categories using the toggle id', () => {
        const toc = extractToc('> # Features\nintro\n\n> ## Serving\nx\n\n> ### Speed Surge\ny')
        expect(toc.entries).toEqual([
            { id: 'features', text: 'Features', depth: 1 },
            { id: 'serving', text: 'Serving', depth: 2 },
        ])
        expect(toc.toggleCount).toBe(3)
    })

    it('counts no toggles for > headings with nothing under them', () => {
        expect(extractToc('> ### Lonely\n\nnext').toggleCount).toBe(0)
    })

    it('strips markers and formatting from entry text', () => {
        const toc = extractToc('## [buff] **Jump** serve')
        expect(toc.entries).toEqual([{ id: 'jump-serve', text: 'Jump serve', depth: 2 }])
    })

    it('keeps the overview id free for the overview anchor', () => {
        const toc = extractToc('Intro\n# Overview')
        expect(toc.entries[0].id).toBe('overview-2')
    })

    it('returns nothing for an empty body', () => {
        expect(extractToc('')).toEqual({ overview: false, entries: [], toggleCount: 0 })
    })

    it('produces ids that exist in the rendered body', () => {
        const body = [
            'Intro text',
            '# Features',
            '## Serving',
            '## Serving',
            '## [nerf] Spike *rework*',
            '> # Bug Fixes',
            'fixed',
            '',
            '> ## Overview',
            'x',
            '',
            '## サーブ',
            '## !!!',
        ].join('\n')
        const html = renderToStaticMarkup(<ChangelogBody body={body} />)
        const ids = extractToc(body).entries.map(e => e.id)
        expect(ids).toEqual(['features', 'serving', 'serving-2', 'spike-rework', 'bug-fixes', 'overview-2', 'サーブ', 'section'])
        for (const id of ids) expect(html).toContain(`id="${id}"`)
    })
})
