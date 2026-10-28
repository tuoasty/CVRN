export const FIELD_LABEL = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground'
export const FIELD_INPUT = 'h-8 rounded-sm text-sm'
export const NUMBER_INPUT = 'h-8 rounded-sm text-right font-mono text-sm tabular-nums'
export const LINK = 'text-xs text-primary hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40 disabled:no-underline'
export const OPTION = 'pb-1 text-sm transition-colors duration-150 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
export const OPTION_ON = 'font-semibold text-foreground shadow-[inset_0_-2px_0_currentColor]'
export const OPTION_OFF = 'text-muted-foreground hover:text-foreground'

export function toInt(text: string): number {
    return text.trim() === '' ? NaN : Number(text)
}
