import type { ScalarValue } from '../types/datasets'

export function fmt(value: number): string {
    return String(Number(value.toFixed(3)))
}

export function pctChange(multiplier: number): number {
    return Math.round(Math.abs(multiplier - 1) * 100)
}

export function pct(fraction: number): string {
    return `${fmt(fraction * 100)}%`
}

export function num(value: ScalarValue): number {
    return typeof value === 'number' ? value : Number(value)
}

export function withUnit(value: number, unit?: string): string {
    if (!unit) return fmt(value)
    return `${fmt(value)}${unit}`
}

export function humanize(tag: string): string {
    const words = tag.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').toLowerCase()
    return words.charAt(0).toUpperCase() + words.slice(1)
}

export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1)
}
