function Block({ className }: { className: string }) {
    return <div className={`animate-pulse bg-muted/40 motion-reduce:animate-none ${className}`} />
}

export default function SpecLoading() {
    return (
        <div>
            <div className="mb-7 grid grid-cols-[minmax(0,140px)_1fr] items-end gap-5 sm:grid-cols-[190px_1fr] sm:gap-7">
                <Block className="aspect-[4/5] w-full" />
                <div className="space-y-2">
                    <Block className="h-4 w-24" />
                    <Block className="h-8 w-3/4" />
                    <Block className="h-10 w-1/2" />
                </div>
            </div>
            {[...Array(8)].map((_, i) => <Block key={i} className="mb-2 h-5 w-60" />)}
        </div>
    )
}
