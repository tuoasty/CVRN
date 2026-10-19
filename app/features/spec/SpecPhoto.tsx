import Image from 'next/image'
import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpecPhotoProps {
    url: string | null
    name: string
    sizes: string
    className?: string
}

export default function SpecPhoto({ url, name, sizes, className }: SpecPhotoProps) {
    return (
        <div className={cn('relative aspect-[4/5] overflow-hidden bg-muted', className)}>
            {url
                ? <Image src={url} alt={name} fill sizes={sizes} className="object-cover object-[50%_20%]" />
                : <UserRound aria-hidden className="absolute inset-0 m-auto h-1/2 w-1/2 text-muted-foreground/50" strokeWidth={1.25} />}
        </div>
    )
}
