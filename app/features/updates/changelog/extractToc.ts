import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkChangelog, { prepareChangelog, textOf, type MdNode } from './remarkChangelog'

export interface TocEntry {
    id: string
    text: string
    depth: 1 | 2
}

export interface ChangelogToc {
    overview: boolean
    entries: TocEntry[]
    toggleCount: number
}

function tocEntry(node: MdNode): TocEntry | null {
    const heading = node.type === 'changelogToggle' ? node.children?.[0]?.children?.[0] : node
    if (heading?.type !== 'heading' || (heading.depth !== 1 && heading.depth !== 2)) return null
    const id = node.data?.hProperties?.id
    if (typeof id !== 'string') return null
    return { id, text: textOf(heading).trim(), depth: heading.depth }
}

export function extractToc(body: string): ChangelogToc {
    const { source, toggles } = prepareChangelog(body)
    const processor = unified().use(remarkParse).use(remarkGfm).use(remarkBreaks).use(remarkChangelog, { toggles })
    const tree = processor.runSync(processor.parse(source)) as MdNode
    const children = tree.children ?? []

    const entries: TocEntry[] = []
    let firstEntryIndex = -1
    children.forEach((node, i) => {
        const entry = tocEntry(node)
        if (!entry) return
        if (firstEntryIndex === -1) firstEntryIndex = i
        entries.push(entry)
    })

    return {
        overview: firstEntryIndex === -1 ? children.length > 0 : firstEntryIndex > 0,
        entries,
        toggleCount: children.filter(node => node.type === 'changelogToggle').length,
    }
}
