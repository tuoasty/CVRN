import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ChangelogLayout from '../ChangelogLayout'

const toc = {
    overview: true,
    entries: [{ id: 'balance', text: 'Balance', depth: 1 as const }],
    toggleCount: 0,
}

function tocLinks(html: string): string[] {
    const nav = /<nav aria-label="On this page">([\s\S]*?)<\/nav>/.exec(html)![1]
    return [...nav.matchAll(/<a ([^>]*)>([^<]*)<\/a>/g)].map(m => `${/href="([^"]+)"/.exec(m[1])![1]} ${m[2]}`)
}

describe('ChangelogLayout', () => {
    it('lists the update title first, linking to the top of the page', () => {
        const html = renderToStaticMarkup(
            <ChangelogLayout toc={toc} title="Spring patch" header={null} footer={null}>
                <p>body</p>
            </ChangelogLayout>,
        )
        expect(tocLinks(html)).toEqual(['#top Spring patch', '#overview Overview', '#balance Balance'])
    })
})
