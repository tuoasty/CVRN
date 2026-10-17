import type { VariantMatch } from '../../types/abilityIndex'

const PREFIX = /^(slightly buffed|slightly nerfed|buffed|nerfed|halved|auto|[+-]\d*\.?\d+)\s+/i

export type VariantResolver = (name: string) => VariantMatch | undefined

export function createVariantResolver(keys: Iterable<string>): VariantResolver {
    const byLower = new Map<string, string>()
    for (const key of keys) byLower.set(key.toLowerCase(), key)

    return name => {
        let rest = name.trim()
        const leading: string[] = []
        let match: VariantMatch | undefined

        for (let prefix = PREFIX.exec(rest); prefix; prefix = PREFIX.exec(rest)) {
            leading.push(prefix[1])
            rest = rest.slice(prefix[0].length)
            const key = byLower.get(rest.toLowerCase())
            if (key) match = { base: key, modifier: leading.join(' ') }
        }

        return match
    }
}
