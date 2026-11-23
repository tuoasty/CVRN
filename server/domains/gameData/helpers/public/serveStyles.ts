import type { ServeStyle, ServeStyleValue } from '../../types/datasets'
import type { PublicServeStyle } from '../../types/publicInformation'
import type { TermBook } from '../../terms/types'
import { fmt, humanize } from '../../terms/format'
import { renderTemplate } from '../../terms/template'
import { styleTunables } from '../serveStyles/styleTunable'
import { toSlug } from './slug'

export function describeStyleValue(tunable: string, value: number, terms: TermBook): string {
    const template = terms.params.get(tunable)?.template
    return template ? renderTemplate(template, value) : `${humanize(tunable)}: ${fmt(value)}`
}

export function buildServeStyles(styles: ServeStyle[], values: ServeStyleValue[], terms: TermBook): PublicServeStyle[] {
    if (styles.length === 0) return []
    const oddsPct = 100 / styles.length
    return styles.map(style => {
        const matches = styleTunables(style.name, values)
        const match = matches.length === 1 ? matches[0] : null
        return {
            name: style.name,
            slug: toSlug(style.name),
            tunable: match?.key ?? null,
            value: match?.value ?? null,
            oddsPct,
            text: match ? describeStyleValue(match.key, match.value, terms) : '',
        }
    })
}
