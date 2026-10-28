import { ImageResponse } from 'next/og'
import type { CSSProperties } from 'react'
import { CardData, CardLayer, CardTemplate } from '../types'
import { resolveCardText } from './toCardShapes'

export interface CardAssets {
    art: Record<string, string>
    headshot: string | null
    teamLogo: string | null
}

const JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' } as const

function boxStyle(layer: CardLayer): CSSProperties {
    return { position: 'absolute', left: layer.x, top: layer.y, width: layer.w, height: layer.h, display: 'flex' }
}

function renderLayer(layer: CardLayer, index: number, data: CardData, assets: CardAssets) {
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
    return (
        <div
            key={index}
            style={{
                ...boxStyle(layer),
                alignItems: 'center',
                justifyContent: JUSTIFY[layer.align],
                fontSize: layer.size,
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
    const response = new ImageResponse(
        (
            <div style={{ position: 'relative', display: 'flex', width: template.width, height: template.height }}>
                {template.layers.map((layer, i) => renderLayer(layer, i, data, assets))}
            </div>
        ),
        { width: template.width, height: template.height },
    )
    return Buffer.from(await response.arrayBuffer())
}
