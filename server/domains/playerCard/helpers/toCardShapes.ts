import { CardGroupRow, CardTemplateRow, PlayerCardRow } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { STORAGE_PATHS } from '@/server/storage/storage.paths'
import { CARD_STAT_LABELS, CardData, CardStatField, CardGroup, CardLayersSchema, CardTemplate, CardTextLayer, PlayerCard } from '../types'

export type ArtLocation = { url: string } | { path: string }

export function resolveArtLocation(src: string, groupSlug: string, tier: number): ArtLocation {
    if (/^https?:\/\//.test(src)) return { url: src }
    if (src.includes('/')) return { path: src.replace(/^\/+/, '') }
    return { path: STORAGE_PATHS.cardTemplateAsset(groupSlug, tier, src) }
}

export function pickTierTemplate<T extends { tier: number; minOvr: number }>(templates: T[], ovr: number): T | null {
    return [...templates].sort((a, b) => a.tier - b.tier).find(t => ovr >= t.minOvr) ?? null
}

export function toCardTemplate(row: CardTemplateRow, groupSlug: string): Result<CardTemplate> {
    const layers = CardLayersSchema.safeParse(row.layers)
    if (!layers.success) {
        return Err({
            message: `Card template "${row.name}" has invalid layers: ${layers.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join(', ')}`,
            code: 'VALIDATION_ERROR',
        })
    }
    return Ok({
        id: row.id,
        groupId: row.group_id,
        groupSlug,
        name: row.name,
        tier: row.tier,
        minOvr: row.min_ovr,
        width: row.canvas_width,
        height: row.canvas_height,
        layers: layers.data,
    })
}

export function toCardGroup(
    group: CardGroupRow,
    templates: CardTemplateRow[],
    toPublicUrl: (location: ArtLocation) => string,
): CardGroup {
    return {
        id: group.id,
        slug: group.slug,
        name: group.name,
        isLimited: group.is_limited,
        isActive: group.is_active,
        templates: templates
            .filter(t => t.group_id === group.id)
            .sort((a, b) => a.tier - b.tier)
            .map(row => {
                const parsed = toCardTemplate(row, group.slug)
                const firstArt = parsed.ok ? parsed.value.layers.find(l => l.kind === 'art') : undefined
                return {
                    id: row.id,
                    name: row.name,
                    tier: row.tier,
                    minOvr: row.min_ovr,
                    width: row.canvas_width,
                    height: row.canvas_height,
                    layerCount: parsed.ok ? parsed.value.layers.length : 0,
                    layers: parsed.ok ? parsed.value.layers : null,
                    previewUrl: firstArt?.kind === 'art' ? toPublicUrl(resolveArtLocation(firstArt.src, group.slug, row.tier)) : null,
                    problem: parsed.ok ? null : parsed.error.message,
                }
            }),
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
            case 'custom': return layer.text ?? ''
        }
    })()
    return layer.uppercase ? raw.toUpperCase() : raw
}
