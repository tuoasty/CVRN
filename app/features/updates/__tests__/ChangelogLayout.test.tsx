import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ChangelogLayout from '../ChangelogLayout'

const toc = {
    overview: true,
    entries: [{ id: 'balance', text: 'Balance', depth: 1 as const }],
    toggleCount: 0,
}

function render(title: string | null): string {
    return renderToStaticMarkup(
        <ChangelogLayout toc={toc} version="1.5" title={title} header={null} footer={null}>
            <p>body</p>
        </ChangelogLayout>,
    )
}

function text(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

describe('ChangelogLayout', () => {
    it('heads the sidebar with the update title, linking to the top of the page', () => {
        const nav = /<nav aria-label="On this page">([\s\S]*?)<\/nav>/.exec(render('Spring patch'))![1]
        const top = /<a href="#top"[^>]*>([\s\S]*?)<\/a>/.exec(nav)!
        expect(text(top[1])).toBe('1.5 Spring patch')
        expect(nav.indexOf('href="#top"')).toBeLessThan(nav.indexOf('On this page'))
        expect(nav.indexOf('On this page')).toBeLessThan(nav.indexOf('href="#overview"'))
    })

    it('shows the version alone when the update has no title', () => {
        const nav = /<nav aria-label="On this page">([\s\S]*?)<\/nav>/.exec(render(null))![1]
        const top = /<a href="#top"[^>]*>([\s\S]*?)<\/a>/.exec(nav)!
        expect(text(top[1])).toBe('1.5')
    })
})
