function Group({ first }: { first?: boolean }) {
    return (
        <div className={first ? '' : 'mt-11'}>
            <div className="mb-2.5 h-5 w-32 animate-pulse bg-muted/50 motion-reduce:animate-none" />
            {[...Array(6)].map((_, i) => (
                <div key={i} className="py-2">
                    <div className="h-5 w-full animate-pulse bg-muted/40 motion-reduce:animate-none" />
                </div>
            ))}
        </div>
    )
}

export default function BuildsLoading() {
    return (
        <div>
            <div className="mb-9 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-2 md:flex-row md:gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-[47px] w-full animate-pulse bg-muted/45 motion-reduce:animate-none md:w-[190px]" />
                    ))}
                </div>
                <div className="h-9 w-full animate-pulse bg-muted/40 motion-reduce:animate-none md:w-[260px]" />
            </div>
            <Group first />
            <Group />
        </div>
    )
}
