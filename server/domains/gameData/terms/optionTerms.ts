import type { OptionTerm } from './types'
import { formatGameHeight } from '@/shared/utils/height'
import { num } from './format'

export const SKIPPED_OPTIONS = new Set(['Group'])

export const OPTION_TERMS: Record<string, OptionTerm> = {
    Mode: { describe: v => (v === 'Spike' ? 'spike mode only' : v === 'Block' ? 'block mode only' : `${String(v).toLowerCase()} only`) },
    Standing: { describe: v => (v === true ? 'standing jumps' : null) },
    ShortBonus: { describe: v => (v === true ? 'stronger on shorter builds and diminishes as builds get taller' : null) },
    MaxHeight: { describe: v => `up to ${formatGameHeight(num(v))}` },
    MinHeight: { describe: v => `from ${formatGameHeight(num(v))}` },
    RolledOnly: { describe: v => (v === true ? 'only as your rolled trait' : null) },
    AtHeight: { describe: v => `at ${formatGameHeight(num(v))}`, guess: true },
    Below: { describe: v => (num(v) === 1 ? 'and below' : `below by ${v}`), guess: true },
}
