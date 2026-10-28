import { ImageResponse } from 'next/og'
import type { CSSProperties } from 'react'
import { CardData, CardLayer, CardTemplate } from '../types'
import { resolveCardText } from './toCardShapes'
import { CARD_FONT_FAMILY, CardFont, loadCardFont } from './cardFont'
import { fitFontSize } from './fitFontSize'

export interface CardAssets {
    art: Record<string, string>
    headshot: string | null
    teamLogo: string | null
}

const MIN_SIZE_RATIO = 0.5

function boxStyle(layer: CardLayer): CSSProperties {
    return { position: 'absolute', left: layer.x, top: layer.y, width: layer.w, height: layer.h, display: 'flex' }
}

function renderLayer(layer: CardLayer, index: number, data: CardData, assets: CardAssets, font: CardFont) {
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

    const text = resolveCardText(layer, data)
    if (!text) return null
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

export async function renderCard(template: CardTemplate, data: CardData, assets: CardAssets): Promise<Buffer> {
    const font = await loadCardFont()
    const response = new ImageResponse(
        (
            <div style={{ position: 'relative', display: 'flex', width: template.width, height: template.height, fontFamily: CARD_FONT_FAMILY }}>
                {template.layers.map((layer, i) => renderLayer(layer, i, data, assets, font))}
            </div>
        ),
        {
            width: template.width,
            height: template.height,
            fonts: [{ name: CARD_FONT_FAMILY, data: font.data, weight: 400, style: 'normal' }],
        },
    )
    return Buffer.from(await response.arrayBuffer())
}
