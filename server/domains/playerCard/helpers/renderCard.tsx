import { ImageResponse } from 'next/og'
import type { CSSProperties } from 'react'
import { CARD_STAT_LABELS, CARD_STATS_COLUMNS, CardData, CardLayer, CardStatsLayer, CardTemplate } from '../types'
import { resolveCardText } from './toCardShapes'
import { CardFont, CardFonts, fontKeyForField } from './cardFont'
import { fitFontSize, fitRunsFontSize, measureTextWidth } from './fitFontSize'

export interface CardAssets {
    art: Record<string, string>
    headshot: string | null
    teamLogo: string | null
}

interface OgFont {
    name: string
    data: ArrayBuffer
    weight: 400
    style: 'normal'
}

const MIN_SIZE_RATIO = 0.5

const ogFontsBySet = new WeakMap<CardFonts, OgFont[]>()

function toOgFonts(fonts: CardFonts): OgFont[] {
    const existing = ogFontsBySet.get(fonts)
    if (existing) return existing
    const built = Object.values(fonts).map((f): OgFont => ({ name: f.name, data: f.data, weight: 400, style: 'normal' }))
    ogFontsBySet.set(fonts, built)
    return built
}

function boxStyle(layer: CardLayer): CSSProperties {
    return { position: 'absolute', left: layer.x, top: layer.y, width: layer.w, height: layer.h, display: 'flex' }
}

function renderStats(layer: CardStatsLayer, index: number, data: CardData, fonts: CardFonts) {
    const font = fonts.norms
    const bold = fonts.normsBold
    const rows = Math.max(...CARD_STATS_COLUMNS.map(column => column.length))
    const cellWidth = layer.w / CARD_STATS_COLUMNS.length
    const cellHeight = layer.h / rows
    const minSize = layer.minSize ?? layer.size * MIN_SIZE_RATIO

    const columns = CARD_STATS_COLUMNS.map(column => {
        const cells = column.map(field => ({ field, value: String(data.attributes[field]), label: CARD_STAT_LABELS[field] }))
        const widest = (texts: string[], f: CardFont) => texts.reduce((a, b) => (
            measureTextWidth(b, f.font, 1, 0) > measureTextWidth(a, f.font, 1, 0) ? b : a
        ))
        return { cells, widestValue: widest(cells.map(c => c.value), bold), widestLabel: widest(cells.map(c => c.label), font) }
    })

    const fontSize = Math.min(...columns.map(column => fitRunsFontSize([
        { text: column.widestValue, font: bold.font },
        { text: ' ', font: font.font },
        { text: column.widestLabel, font: font.font },
    ], {
        width: cellWidth,
        height: cellHeight,
        maxSize: layer.size,
        minSize,
        letterSpacing: layer.letterSpacing,
    })))
    const slot = (text: string, f: CardFont = font) => Math.ceil(measureTextWidth(text, f.font, fontSize, layer.letterSpacing)) + 1
    const gap = slot(' ')

    return (
        <div
            key={index}
            style={{
                ...boxStyle(layer),
                flexDirection: 'row',
                fontFamily: font.name,
                fontSize,
                color: layer.color,
                letterSpacing: layer.letterSpacing,
                lineHeight: 1,
            }}
        >
            {columns.map((column, c) => {
                const valueWidth = slot(column.widestValue, bold)
                const labelWidth = slot(column.widestLabel)
                return (
                    <div key={c} style={{ display: 'flex', flexDirection: 'column', width: cellWidth, height: layer.h }}>
                        {column.cells.map(cell => (
                            <div
                                key={cell.field}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: cellWidth, height: cellHeight, whiteSpace: 'nowrap', overflow: 'hidden' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'flex-start', width: valueWidth, fontFamily: bold.name }}>{cell.value}</div>
                                <div style={{ display: 'flex', width: gap }} />
                                <div style={{ display: 'flex', justifyContent: 'flex-start', width: labelWidth }}>{cell.label}</div>
                            </div>
                        ))}
                    </div>
                )
            })}
        </div>
    )
}

function renderLayer(layer: CardLayer, index: number, data: CardData, assets: CardAssets, fonts: CardFonts) {
    if (layer.kind === 'art') {
        const src = assets.art[layer.src]
        if (!src) return null
        return <img key={index} src={src} alt="" width={layer.w} height={layer.h} style={boxStyle(layer)} />
    }

    if (layer.kind === 'image') {
        const src = layer.field === 'headshot' ? assets.headshot : assets.teamLogo
        if (!src) return null
        return (
            <img
                key={index}
                src={src}
                alt=""
                width={layer.w}
                height={layer.h}
                style={{ ...boxStyle(layer), objectFit: layer.fit }}
            />
        )
    }

    if (layer.kind === 'stats') return renderStats(layer, index, data, fonts)

    const text = resolveCardText(layer, data)
    if (!text) return null
    const font = fonts[fontKeyForField(layer.field)]
    const fontSize = fitFontSize({
        text,
        font: font.font,
        width: layer.w,
        height: layer.h,
        maxSize: layer.size,
        minSize: layer.minSize ?? layer.size * MIN_SIZE_RATIO,
        letterSpacing: layer.letterSpacing,
    })
    return (
        <div
            key={index}
            style={{
                ...boxStyle(layer),
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: font.name,
                fontSize,
                color: layer.color,
                letterSpacing: layer.letterSpacing,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
            }}
        >
            {text}
        </div>
    )
}

export async function renderCard(template: CardTemplate, data: CardData, assets: CardAssets, fonts: CardFonts): Promise<Buffer> {
    const response = new ImageResponse(
        (
            <div style={{ position: 'relative', display: 'flex', width: template.width, height: template.height, fontFamily: fonts.norms.name }}>
                {template.layers.map((layer, i) => renderLayer(layer, i, data, assets, fonts))}
            </div>
        ),
        {
            width: template.width,
            height: template.height,
            fonts: toOgFonts(fonts),
        },
    )
    return Buffer.from(await response.arrayBuffer())
}
