import { CardGroupRow, CardTemplateRow, PlayerCardRow } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { STORAGE_PATHS } from '@/server/storage/storage.paths'
import { CARD_STAT_LABELS, CardData, CardStatField, CardGroup, CardLayer, CardLayersSchema, CardTemplate, CardTextLayer, PlayerCard } from '../types'

export type ArtLocation = { url: string } | { path: string }

export function resolveArtLocation(src: string, templateId: string): ArtLocation {
    if (/^https?:\/\//.test(src)) return { url: src }
    if (src.includes('/')) return { path: src.replace(/^\/+/, '') }
    return { path: STORAGE_PATHS.cardTemplateAsset(templateId, src) }
}

export function isBareArtSrc(src: string): boolean {
    return !/^https?:\/\//.test(src) && !src.includes('/')
}

export function rankTemplates<T extends { minOvr: number }>(templates: T[]): (T & { rank: number })[] {
    return [...templates].sort((a, b) => b.minOvr - a.minOvr).map((t, i) => ({ ...t, rank: i + 1 }))
}

export function pickTierTemplate<T extends { minOvr: number }>(templates: T[], ovr: number): T | null {
    return [...templates].sort((a, b) => b.minOvr - a.minOvr).find(t => ovr >= t.minOvr) ?? null
}

export function ladderProblem(templates: { minOvr: number }[]): string | null {
    if (templates.length === 0) return 'No tiers'
    const lowest = Math.min(...templates.map(t => t.minOvr))
    if (lowest <= 1) return null
    const gap = lowest === 2 ? '1' : `1–${lowest - 1}`
    return `OVR ${gap} has no card. Set the lowest tier's floor to 1.`
}

export function withArtVersion(url: string, version: number | undefined): string {
    if (!version) return url
    return `${url}${url.includes('?') ? '&' : '?'}v=${version}`
}

export function firstArtSrc(group: CardGroupRow): string | null {
    const parsed = parseLayers(group, { allowEmpty: true })
    const art = parsed.ok ? parsed.value.find(l => l.kind === 'art') : undefined
    return art?.kind === 'art' ? art.src : null
}

function parseLayers(group: CardGroupRow, opts: { allowEmpty: boolean }): Result<CardLayer[]> {
    if (opts.allowEmpty && Array.isArray(group.layers) && group.layers.length === 0) return Ok([])
    const layers = CardLayersSchema.safeParse(group.layers)
    if (!layers.success) {
        return Err({
            message: `${group.name} has an invalid layout: ${layers.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join(', ')}`,
            code: 'VALIDATION_ERROR',
        })
    }
    return Ok(layers.data)
}

export function copyableLayers(group: CardGroupRow): Result<CardLayer[]> {
    return parseLayers(group, { allowEmpty: true })
}

export function toCardTemplate(tier: CardTemplateRow, group: CardGroupRow): Result<CardTemplate> {
    const layers = parseLayers(group, { allowEmpty: false })
    if (!layers.ok) return layers
    return Ok({
        id: tier.id,
        groupId: group.id,
        name: tier.name,
        minOvr: tier.min_ovr,
        width: group.canvas_width,
        height: group.canvas_height,
        layers: layers.value,
    })
}

export function toCardGroup(
    group: CardGroupRow,
    templates: CardTemplateRow[],
    artUrl: (templateId: string) => string | null,
): CardGroup {
    const own = rankTemplates(templates.filter(t => t.group_id === group.id).map(row => ({ row, minOvr: row.min_ovr })))
    const parsed = parseLayers(group, { allowEmpty: true })
    return {
        id: group.id,
        name: group.name,
        isActive: group.is_active,
        sortOrder: group.sort_order,
        width: group.canvas_width,
        height: group.canvas_height,
        layers: parsed.ok ? parsed.value : null,
        layersProblem: parsed.ok ? null : parsed.error.message,
        problem: ladderProblem(own),
        templates: own.map(({ row, rank }) => ({
            id: row.id,
            name: row.name,
            rank,
            minOvr: row.min_ovr,
            previewUrl: artUrl(row.id),
        })),
    }
}

export function toPlayerCard(row: PlayerCardRow): PlayerCard {
    return {
        playerId: row.player_id,
        seasonNumber: row.season_number,
        groupId: row.group_id,
        templateId: row.template_id,
        ovr: row.ovr,
        attributes: {
            scoring: row.scoring,
            spiking: row.spiking,
            setting: row.setting,
            blocking: row.blocking,
            receiving: row.receiving,
            serving: row.serving,
        },
        position: row.position,
        teamId: row.team_id,
        imageUrl: row.image_url,
        generatedAt: row.generated_at,
    }
}

export function statCellText(field: CardStatField, data: CardData): string {
    return `${data.attributes[field]} ${CARD_STAT_LABELS[field]}`
}

export function resolveCardText(layer: CardTextLayer, data: CardData): string {
    const raw = (() => {
        switch (layer.field) {
            case 'username': return data.username
            case 'displayName': return data.displayName ?? data.username
            case 'ovr': return String(data.ovr)
            case 'position': return data.position ?? ''
            case 'teamName': return data.teamName ?? ''
            case 'season': return data.season
            case 'custom': return layer.text ?? ''
        }
    })()
    return layer.uppercase ? raw.toUpperCase() : raw
}
