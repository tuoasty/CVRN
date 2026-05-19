"use client"

import Image from 'next/image'
import Link from 'next/link'
import { Image as ImageIcon, Video, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/app/components/ui/skeleton'
import { useRecentMediaPosts } from '@/app/hooks/useMediaPosts'

function TypeDot({ type }: { type: string }) {
    const colors: Record<string, string> = {
        gfx:   'bg-violet-400',
        video: 'bg-blue-400',
        news:  'bg-green-400',
        recap: 'bg-orange-400',
    }
    return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[type] ?? 'bg-muted-foreground'}`} />
}

export default function MediaSidebar() {
    const { posts, isLoading } = useRecentMediaPosts(4)

    if (isLoading) {
        return (
            <div className="panel p-3 space-y-3">
                <Skeleton className="h-3 w-16 rounded-sm" />
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-1.5">
                        <Skeleton className="aspect-video w-full rounded-sm" />
                        <Skeleton className="h-2.5 w-3/4 rounded-sm" />
                    </div>
                ))}
            </div>
        )
    }

    if (posts.length === 0) {
        return (
            <div className="panel p-4 bg-gradient-to-br from-muted/30 to-transparent min-h-[200px]">
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    <h4 className="text-xs font-bold text-muted-foreground">Media</h4>
                    <p className="text-[10px] text-muted-foreground/70 text-center">No posts yet</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="panel p-3 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Media</h4>
                {posts.map(post => (
                    <div key={post.id} className="space-y-1 rounded-sm p-1 -mx-1 hover:bg-muted/40 cursor-pointer transition-colors">
                        {post.image_url && (
                            <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-border">
                                <Image src={post.image_url} alt={post.title} fill sizes="200px" className="object-cover" />
                                {post.type === 'video' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <Video className="h-6 w-6 text-white" />
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 px-0.5">
                            <TypeDot type={post.type} />
                            <p className="text-xs font-semibold truncate flex-1">{post.title}</p>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </div>
                ))}
                <Link href="/media" className="flex items-center justify-center gap-1 text-xs text-primary font-medium hover:underline pt-1">
                    View all <ArrowRight className="h-3 w-3" />
                </Link>
            </div>
        </div>
    )
}
