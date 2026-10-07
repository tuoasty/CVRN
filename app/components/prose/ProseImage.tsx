import { cn } from '@/lib/utils'
import type { ImagePlacement, ImageWidth } from '@/shared/utils/imageTokens'

interface Props {
    url: string
    placement: ImagePlacement
    width?: ImageWidth
    caption?: string | null
}

export default function ProseImage({ url, placement, width, caption }: Props) {
    const image = <img src={url} alt={caption ?? ''} loading="lazy" className="w-full h-auto rounded-sm border border-border" />
    const figcaption = caption ? <figcaption className="mt-2 text-xs text-muted-foreground">{caption}</figcaption> : null

    if (placement === 'center') {
        return (
            <figure className="clear-both my-8">
                {image}
                {figcaption}
            </figure>
        )
    }
    const widthClass = width === 25 ? 'w-1/4' : width === 75 ? 'w-3/4' : 'w-1/2'
    return (
        <figure
            className={cn(
                'my-2',
                widthClass,
                placement === 'left' ? 'float-left mr-5 mb-3' : 'float-right ml-5 mb-3',
            )}
        >
            {image}
            {figcaption}
        </figure>
    )
}
