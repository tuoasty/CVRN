import type { ServeStyleValue } from '../../types/datasets'

export function styleTunables(style: string, values: ServeStyleValue[]): ServeStyleValue[] {
    const prefix = style.replace(/\s+/g, '')
    return values.filter(v => v.key.startsWith(prefix))
}
